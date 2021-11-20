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

    /*
    # Copyright 2018, Google Inc.
    # All rights reserved.
    #
    # Redistribution and use in source and binary forms, with or without
    # modification, are permitted provided that the following conditions are
    # met:
    #
    #     * Redistributions of source code must retain the above copyright
    #       notice, this list of conditions and the following disclaimer.
    #
    #     * Redistributions in binary form must reproduce the above
    #       copyright notice, this list of conditions and the following disclaimer
    #       in the documentation and/or other materials provided with the
    #       distribution.
    #
    #     * Neither the name of Google Inc. nor the names of their
    #       contributors may be used to endorse or promote products derived from
    #       this software without specific prior written permission.
    #
    # THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
    # "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
    # LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
    # A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
    # OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
    # SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
    # LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
    # DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    # THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    # (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    # OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    */
    function rendererNeedsResize(renderer) {
        const canvas = renderer.domElement;
        const pixelRatio = window.devicePixelRatio;
        const width  = canvas.clientWidth  * pixelRatio | 0;
        const height = canvas.clientHeight * pixelRatio | 0;
        const needsResize = (canvas.width !== width) || (canvas.height !== height);
        if (needsResize) {
            renderer.setSize(width, height, false);
        }
        return needsResize;
    }

    // Render loop
    function render(timeElapsed /* in milliseconds */) {
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
