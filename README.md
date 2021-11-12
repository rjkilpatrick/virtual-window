# Virtual Window

![Screenshot of program](assets/img/Screenshot.png)

This project was inspired by a cool [blog post](https://charliegerard.dev/blog/interactive-frame-head-tracking/).

## Get Started

See it live [here](<https://rjkilpatrick.github.io/virtual-window/>)

## How?

Using a pre-trained model (PoseNet) using [ml5js](https://ml5js.org/) we estimate eye-position, and then use [ThreeJS](https://threejs.org/) to render the screen from this eye position.

In future, I would like to estimate head depth, but this would involve using a more complicated model.

## License

Lucy model adapted from [Princeton Suggestive Contour Gallery
](https://gfx.cs.princeton.edu/proj/sugcon/models/), originally from [Stanford 3D scanning respository](https://graphics.stanford.edu/data/3Dscanrep/).

[MIT](./LICENSE)
