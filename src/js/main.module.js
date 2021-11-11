import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

let poses = [
    {
        pose: {
            leftEye: {
                x: 28.170260095410782,
                y: 115.84622294058595,
            },
            rightEye: {
                x: 50.06473260352584,
                y: 114.29153611223984,
                confidence: 0.9995846152305603
            },
        }
    }
];

const lookSensitivity = 0.005;

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
    poseNet.on("pose", function (results) {
        poses = results;
        console.log(eyePoseEstimation());
    });
}

function eyePoseEstimation() {
    if ((poses.length >= 1) && (poses[0].pose)) {
        return [[poses[0].pose.leftEye.x, poses[0].pose.leftEye.y],
        [poses[0].pose.rightEye.x, poses[0].pose.rightEye.y]];
    }
    return []
}

function main() {
    // Handles to canvas
    const canvas = document.querySelector("#c");
    const renderer = new THREE.WebGLRenderer({ canvas });

    // Scene
    const scene = new THREE.Scene();

    // Light
    {
        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(-1, 2, 4);
        scene.add(light);
    }

    // Box
    {
        const boxWidth = 1;
        const boxHeight = 1;
        const boxDepth = 1;
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

        // Material
        const material = new THREE.MeshPhongMaterial({ color: 0x44aa88 });  // greenish blue

        // Mesh (geometry + material)
        const cube = new THREE.Mesh(geometry, material);

        // Append mesh to scene
        scene.add(cube);
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
        let locations = eyePoseEstimation();

        // Resize
        if (rendererNeedsResize(renderer)) {
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        if ((locations.length >= 1) && (locations[0].length >= 1)) {
            camera.position.x = lookSensitivity * locations[0][0];
            camera.position.y = lookSensitivity * locations[0][1];
        }

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

(function () {
    // Downsample image to this size
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const cam_video = document.createElement("video");

    const cam_width = 120;
    const cam_height = 180;

    let streaming = false;

    cam_video.addEventListener('canplay', function (ev) {
        if (!streaming) {
            cam_video.setAttribute('width', cam_width);
            cam_video.setAttribute('height', cam_height);
            canvas.setAttribute('width', cam_width);
            canvas.setAttribute('height', cam_height);
            streaming = true;
        }
    }, false);

    async function init_webcam() {
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

        cam_video.srcObject = stream;
        cam_video.play();
    }

    init_webcam();

    setupPoseNet(cam_video);
})();
