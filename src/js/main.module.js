import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/build/three.module.js';

import { GLTFLoader } from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/examples/jsm/loaders/GLTFLoader.js';

const lookSensitivity = 0.2;
const modelOptions = {
    flipHorizontal: false,
    maxPoseDetections: 1,
}

const cameraWidth = 320;
const cameraHeight = 240;

// Global variable of poses updated when the model runs, set by the video rate
// of the video tag. This is a minimum working environment.
let poses = [
    {
        pose: {
            leftEye: {
                x: 28.0,
                y: 115.0,
            },
            rightEye: {
                x: 50.0,
                y: 114.0,
            },
        }
    }
];

function setupPoseNet(video) {
    // Create a new poseNet method with a single detection
    const poseNet = ml5.poseNet(video, modelOptions, () => {
        console.log("PoseNet loaded");
        main();
    });
    // This sets up an event that fills the global variable "poses"
    // with an array every time new poses are detected
    poseNet.on("pose", (results) => {
        poses = results;
    });
}

function eyePoseEstimation() {
    if (poses && (poses.length >= 1) && (poses[0].pose)) {
        const pose = poses[0].pose;

        // Change from 0 -> max, to [-1, +1]
        const normalize = (position, maximum) => (position / (0.5 * maximum)) - 1;

        const leftEye = new THREE.Vector2(normalize(pose.leftEye.x, cameraWidth), normalize(pose.leftEye.y, cameraHeight));
        const rightEye = new THREE.Vector2(normalize(pose.rightEye.x, cameraWidth), normalize(pose.rightEye.y, cameraHeight));

        return [leftEye, rightEye];
    }
    return [];
}

function main() {
    // Handles to canvas
    const canvas = document.querySelector("#c");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

    // Scene
    const scene = new THREE.Scene();

    // Ambient light
    {
        const color = 0xFFFFFF;
        const intensity = 0.2;
        const light = new THREE.AmbientLight(color, intensity);
        scene.add(light);
    }

    // Directional Light
    {
        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.castShadow = true;
        light.position.set(-1, 2, 4);
        scene.add(light);

        light.target.position.set(0, 0, 0);
        scene.add(light.target);
    }

    // Walls
    {
        const boxWidth = .5;
        const boxHeight = .5;
        const boxDepth = 1.;
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
        const material = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            side: THREE.BackSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0, 0.25);
        mesh.receiveShadow = true;

        scene.add(mesh);
    }

    // Item of interest
    {
        const gltfLoader = new GLTFLoader();

        const url = './assets/lucy/lucy.gltf';
        gltfLoader.load(url, (gltf) => {
            const lucy = gltf.scene;
            lucy.position.set(0, -0.25, 0);
            lucy.scale.set(0.2, 0.2, 0.2);
            scene.add(lucy);
            console.log("Lucy added");
        },
            undefined, (error) => {
                console.error(error);
            });
    }

    // Perspective Camera
    const fov = 75;
    const aspect_ratio = 2.;
    const near_clip = 0.01;
    const far_clip = 50.;
    const camera = new THREE.PerspectiveCamera(fov, aspect_ratio, near_clip, far_clip);

    camera.position.z = 20;

    function rendererNeedsResize(renderer) {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needsResize = (canvas.width !== width) || (canvas.height !== height);
        if (needsResize) {
            renderer.setSize(width, height, false);
        }
        return needsResize;
    }

    // Render loop
    function render(time_elapsed /* in milliseconds */) {
        let [leftEye, rightEye] = eyePoseEstimation();

        // Resize
        if (rendererNeedsResize(renderer)) {
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        if (leftEye && rightEye) {

            camera.position.x = lookSensitivity * 0.5 * -(leftEye.x + rightEye.x);
            camera.position.y = lookSensitivity * 0.5 * -(leftEye.y + rightEye.y);
            camera.position.z = 0.5; // Eye-(0, 0, 0) distance

            // camera.position.set(estimateCameraPosition(eyePoseEstimation()));

            camera.lookAt(0, 0, 0);
        }

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

(function () {
    // Resize image to small size
    const cameraCanvas = document.createElement("canvas");
    const cameraCanvasCtx = cameraCanvas.getContext("2d");
    const cameraVideo = document.createElement("video");

    let isStreaming = false;

    cameraVideo.addEventListener('canplay', function (ev) {
        if (!isStreaming) {
            cameraVideo.setAttribute('width', cameraWidth);
            cameraVideo.setAttribute('height', cameraHeight);
            cameraCanvas.setAttribute('width', cameraWidth);
            cameraCanvas.setAttribute('height', cameraHeight);
            isStreaming = true;
        }
    }, false);

    async function initWebcam() {
        const constraints = { video: true }; // TODO: Fix facingMode

        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (stream) {
                handleHasWebcam(stream);
            })
            .catch(function (err) {
                console.error(err.message);
            });
    }

    function handleHasWebcam(stream) {
        cameraCanvasCtx.transform(-1, 0, 0, 1, cameraCanvas.width, 0);

        cameraVideo.srcObject = stream;
        cameraVideo.play();
    }

    initWebcam();

    setupPoseNet(cameraVideo);
})();
