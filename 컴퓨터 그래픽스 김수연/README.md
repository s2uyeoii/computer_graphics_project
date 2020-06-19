Play at https://reecer62.github.io/Space-Game/.

Player Controls and Interaction:

    Keyboard:
        'W' key will move ship upwards
        'A' key will move ship left
        'S' key will move ship down
        'D' key will move ship right
    Mouse:
        The front of the player's ship will face towards the mouse cursor
        Holding down the left mouse button will cause the ship to fire a laser every 1/4th of a second
        Clicking the left mouse button will fire a single laser from the ship

Implementation Description:

    When the page loads it calls the `initGL()` function which does the following:
        - Setup canvas with WebGL
        - Set canvas background-color to black
        - Initialize the shaders for the entities (e.g. player ship, enemies, laser)
        - Initialize the shaders for the star field layers
        - Setup the star field layers
            - Each star is sized based on the device's pixel ratio
            - Three star field layers are initialized, containing lists of `vec3` points
            - The star field layers each have a different number of stars and shift at a different rate based on camera positioning
                - starLayer1: the bottom layer that contains the least number of stars, shifts the slowest
                - starLayer2: the middle layer
                - starLayer3: the top layer that contains the most number of stars, shifts the fastest
            - Initialize a buffer for each star layer
        - An event listener is attached to the page that sets the values of `mouseX` and `mouseY` when a `mousemove` event occurs. This is done by mapping the mouse's viewport coordinates to the virtual coordinates (event's clientX/clientY -> [-1.0, 1.0])
        - An event listener is attached to the page that listens for mouse clicks that fires when the left mouse button is clicked and checks if that button is held down, if so, it fires a laser every quarter of a second
        - An event listener is attached to the page that listens for `keydown` and `keyup`. This keeps track of a list containing any keys that have been pressed and setting their values to true if their current state is pressed down
        - Thirty enemy entities are randomly generated and added to the `entities` list
            - Position is set randomly to be outside the star field
            - Velocity in x/y is randomly set between 0.0005 and 0.005
            - A random scaling factor between 0.03 and 0.13 is generated and used to determine how far the entity shape's points are away from its origin. The shape is constructed by randomly generating how many vertices it has (between 4 and 9) and spacing them evenly, each having the same angle 
        - The player's ship entity is initialized and added to the `entities` list
            - Position is set at the origin (0,0)
            - Velocity in x/y is twice that of the enemy entity's velocity in x/y, velocity in x/y is set to 0.01
            - The ship's shape is constructed in the function `getShipShape()`
        - For each entity, an `hpBox`, which is a `div` element that gets styled with CSS, is constructed and set/tracked in their object's memory
        - Finally, everything is initialized and `render()` is called

    When `render()` is called, it does the following:
        - `requestAnimationFrame(render)` which will execute this function after the current frame's set of actions that need to be computed and rendered are finished
        - `updateViewport()` checks to see if canvas size has changed and updates canvas to match that area (anytime browser window changes size, this function accounts for this change)
        - Next, move each entity
        - `updateCamera()` makes the camera center on the ship and follows it without moving past the bounds of the star field
        - The star field layers are rendered based on the position of the camera
        - Loop through each entity:
            - If entity `isDone()` then its health has dropped below zero and can be removed from the entity list
            - `onRemove()`: this function is called when an enemy entity's `health` drops to/below zero, then remove the entity from the `entities` list, remove its `hpBox`, and decrement `numEnemies` by one. Note: if `numEnemies` reaches zero, then initiate `gameOver()` in one second
            - Otherwise, each entity has its own class method `render()` called as well as its `hpBox` moved to its new position
                - `renderHpBox()` moves the entity's `hpBox` to the correct position by mapping the `hpBox`'s x/y coordinates from the virtual space to the viewport space (note: its `top` value has 0.05 added to the entity's x-coord value to make sure the `hpBox` is placed above the entity)

    Classes:

        - `Entity` is a super class contains the following:
            - `x`: x-coordinate in which its value is between -1.0 and 1.0 along the x-axis
            - `y`: y-coordinate in which its value is between -1.0 and 1.0 along the y-axis
            - `xv`: velocity of the entity along the x-axis, this value gets added to the `x` coordinate when entity moves left or right
            - `yv`: velocity of the entity along the y-axis, this value gets added to the `y` coordinate when entity moves up or down
            - `points`: a list of vectors that represent the shape of the entity

        - `Ship` inherits from the `Entity` class and contains the following:
            - `hpBox`: html `div` element that contains `health` value and is styled according to that value 
            - `health`: statically set to `100`
            - `colors`: a list of vectors that contain RGB and alpha values, ship's color is statically set to a shade of blue
            - `shipBuffer`: buffer for the ship's `points`
            - `colorBuffer`: buffer for the ship's colors
            - `move()`: this function moves the ships position based off of keyboard input (WASD) and direction (pointer location) within the bounds of the star field (in addition to a small amount of inwards padding). The ship moves to a new position based off of its velocity
            - `isDone()`: returns `true` if the health drops to/below zero
            - `render()`: rotate, translate, and then scale the ship
            - `immaFirinMyLasers()`: fires a laser from the angle the ship's facing, which is determined using `getTheta()`, and if the laser collides with any enemy entities along its path, decrement their `health` by twenty
                - `getTheta()`: helper function that gets the angle between the pointer and the position of entity

        - `Enemy` inherits from the `Entity` class and contains the following:
            - `hpBox`: html `div` element that contains `health` value and is styled according to that value 
            - `sizeFactor`: the radius, which is the distance from the shape's origin to any of its vertices
            - `health`: value is calculated based on `sizeFactor`, or how big the enemy is
            - `colors`: a list of vectors that contain RGB and alpha values, each enemy has their color randomly set
            - `entityBuffer`: buffer for the entity's `points`
            - `colorBuffer`: buffer for the entity's colors
            - `move()`: this function moves the enemy closer to the player every frame (based off of its velocities in x/y)
            - `isDone()`: returns `true` if the health drops to/below zero
            - `render()`: rotate, translate, and then scale the entity
        
        - `Laser` inherits from the `Entity` class and contains the following:
            - `colors`: a list of vectors that contain RGB and alpha values, laser's color is statically set to a shade of red
            - `pointBuffer`: buffer for the laser's `points`
            - `colorBuffer`: buffer for the laser's colors
            - `angle`: calculated based off of pointer position when left mouse button was clicked
            - `expire`: boolean value to store when it is okay to be removed (after 100ms)
            - `isDone()`: returns `true` if `expire` is `true`
            - `render()`: rotate, translate, and then scale the laser

        - `getDistanceFromPointToRay()`: checks if given entity was hit by laser
        - `gameOver()`: triggered when `numEnemies` drops to zero, displays the score (how long it took to destroy all the enemies) and a button to replay the game
