# Three.js Swimmer Animation
![Swimmer Animation Preview](result.gif)

This project showcases a 3D character performing a realistic freestyle swimming animation within a dynamic water and sky environment, built using Three.js.

The animation is generated **procedurally**, meaning the motion is created through code using mathematical functions, not by playing a pre-made animation file.

---

## Key Features

- **Dynamic Water**: Uses `Water.js` for realistic water surfaces with reflections and movement.  
- **Procedural Sky**: Implements `Sky.js` to create a dynamic sky that reflects in the water.  
- **GLTF Model Loading**: Loads a skinned character model using `GLTFLoader`.  
- **Procedural Animation**: Directly manipulates the model's skeleton (bones) in real-time to create the swimming motion.  
- **Interactive Camera**: Includes `OrbitControls` to allow users to pan and zoom around the scene.

---

## How It Works

The core of the project is divided into setup and a continuous animation loop.

### Environment Setup

- The scene is initialized with a camera, renderer, and lighting.
- The Water and Sky objects are added and configured to react to a simulated sun position, creating a cohesive environment.

### Model and Skeleton

- A 3D model in `.glb` format is loaded into the scene.
- The code traverses the model's structure to find its skeleton and saves references to key bones (arms, legs, spine, head) into variables.

### The Animation Loop (`animate` function)

- This function runs on every frame.
- It uses `clock.getElapsedTime()` to drive all animations smoothly.

#### Swimming Motion

- It calculates the rotation for each bone using sine waves (`Math.sin`).  
- By adjusting the phase and amplitude of these waves, it creates:
  - An alternating flutter kick for the legs.
  - An out-of-phase freestyle stroke for the arms, including elbow bending.
  - A natural body roll by rotating the spine bones.
  - A head turn for breathing, synchronized with the body roll.
- The swimmer's overall position is also updated on each frame to move it forward through the water.

---

## How to Run

To run this project, you need a local server to handle the loading of the 3D model and textures.

### Project Structure

Place your `index.html`, the JavaScript file, and the `Masculine_TPose.glb` model in the same directory.

### HTML File

Create an `index.html` file that imports the Three.js library and your script as a module:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Three.js Swimmer</title>
    <style>
      body { margin: 0; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="container"></div>
    <!-- Use an import map to manage Three.js modules -->
    <script type="importmap">
      {
        "imports": {
          "three": "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js",
          "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"
        }
      }
    </script>
    <!-- Link to your main script -->
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

### Run a Local Server

Navigate to your project directory in the terminal and use a simple server. If you have Node.js, you can run:

```bash
npx serve
```

Then open the provided URL (e.g., `http://localhost:3000`) in your browser.
