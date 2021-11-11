import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r132/build/three.module.js';

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

const lookSensitivity = 0.2;

const modelOptions = {
    flipHorizontal: false,
    maxPoseDetections: 1,
}

function setupPoseNet(video) {
    // Create a new poseNet method with a single detection
    const poseNet = ml5.poseNet(video, modelOptions, () => {
        console.log("Model loaded");
        main();
    });
    // This sets up an event that fills the global variable "poses"
    // with an array every time new poses are detected
    poseNet.on("pose", (results) => {
        poses = results;
        console.log(eyePoseEstimation());
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
    const renderer = new THREE.WebGLRenderer({ canvas });

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
        
        // light.target.position.set(0, 0, 0);
        // scene.add(light.target);
    }

    // Walls
    {
        const boxWidth = 1;
        const boxHeight = 1;
        const boxDepth = 0.7;
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
        const material = new THREE.MeshPhongMaterial({
            color: 0xDDDDDD,   // greenish blue
            side: THREE.BackSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0, 0);
        mesh.receiveShadow = true;

        scene.add(mesh);
    }

    // Item of interest
    {
        const cubeSize = 0.05;
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const material = new THREE.MeshPhongMaterial({ color: 0x44aa88 });  // greenish blue
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0, 0);

        scene.add(mesh);
    }

    // Perspective Camera
    const fov = 75;
    const aspect_ratio = 2.;
    const near_clip = 0.1;
    const far_clip = 5.;
    const camera = new THREE.PerspectiveCamera(fov, aspect_ratio, near_clip, far_clip);

    camera.position.z = 2;

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
            camera.position.z = 0.3;

            // camera.position.set(estimateCameraPosition(eyePoseEstimation()));
                
            camera.lookAt(0, 0, 0);
        }

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

const cameraWidth = 320;
const cameraHeight = 240;


(function () {
    // Downsample image to this size
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const cameraVideo = document.createElement("video");

    let streaming = false;

    cameraVideo.addEventListener('canplay', function (ev) {
        if (!streaming) {
            cameraVideo.setAttribute('width', cameraWidth);
            cameraVideo.setAttribute('height', cameraHeight);
            canvas.setAttribute('width', cameraWidth);
            canvas.setAttribute('height', cameraHeight);
            streaming = true;
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
        ctx.transform(-1, 0, 0, 1, canvas.width, 0);

        cameraVideo.srcObject = stream;
        cameraVideo.play();
    }

    initWebcam();

    setupPoseNet(cameraVideo);
})();
