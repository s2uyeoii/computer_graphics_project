var gl

var starLayer1
var starLayer2
var starLayer3

var bufferStarLayer1
var bufferStarLayer2
var bufferStarLayer3

var mouseX = 0
var mouseY = 1

var cameraWidth
var cameraHeight
var cameraX
var cameraY

var aspectRatio

var program
var starFieldProgram

//main list of all entities being rendered
var entities = []

var playerShip

//list of whether each key is pressed or not
var keyTracker = []

var counter = 0
// var prevAngle

var mousePressed = false

var numEnemies = 20

var startTime
var timeTaken

var whilePressed = e => {
	dx = map(
		mouseX,
		-1.0,
		1.0,
		map(cameraX, -1.0 + cameraWidth, 1.0 - cameraWidth, -1.0, 1.0 - cameraWidth * 2.0),
		map(cameraX, -1.0 + cameraWidth, 1.0 - cameraWidth, -1.0 + cameraWidth * 2.0, 1.0)
	) //direction x
	dy = map(
		mouseY,
		-1.0,
		1.0,
		map(cameraY, -1.0 + cameraHeight, 1.0 - cameraHeight, -1.0, 1.0 - cameraHeight * 2.0),
		map(cameraY, -1.0 + cameraHeight, 1.0 - cameraHeight, -1.0 + cameraHeight * 2.0, 1.0)
	) //direction y
	playerShip.immaFirinMyLasers(dx, dy)
}
var mousePressedInterval = null

// var frames = 0

function initGL() {
	// prevAngle = 0.0
	/* Initialize canvas and webgl */
	let canvas = document.getElementById("gl-canvas")
	canvas.width = canvas.clientWidth
	canvas.height = canvas.clientHeight

	gl = WebGLUtils.setupWebGL(canvas)
	if (!gl) { alert("WebGL isn't available") }

	gl.clearColor(0.0, 0.1, 0.3, 1.0) //배경 색상 수정
	gl.clear(gl.COLOR_BUFFER_BIT)

	/* Get vertex/fragment shaders */
	program = initShaders(gl, "vertex-shader", "fragment-shader")
	gl.useProgram(program)

	starFieldProgram = initShaders(gl, "star-vert-shader", "star-frag-shader")
	gl.useProgram(starFieldProgram)

	/* Construct star layers */
	const starPointSize = window.devicePixelRatio * 2.0
	let pointSizeLoc = gl.getUniformLocation(starFieldProgram, 'pointSize')
	gl.uniform1f(pointSizeLoc, starPointSize)

	starLayer1 = createStarFieldLayer(200 * 2, 0.625)
	starLayer2 = createStarFieldLayer(380 * 2, 0.75)
	starLayer3 = createStarFieldLayer(600 * 2, 0.875)

	/* Setup buffers */
	bufferStarLayer1 = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferStarLayer1)
	gl.bufferData(gl.ARRAY_BUFFER, flatten(starLayer1), gl.STATIC_DRAW)

	bufferStarLayer2 = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferStarLayer2)
	gl.bufferData(gl.ARRAY_BUFFER, flatten(starLayer2), gl.STATIC_DRAW)

	bufferStarLayer3 = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferStarLayer3)
	gl.bufferData(gl.ARRAY_BUFFER, flatten(starLayer3), gl.STATIC_DRAW)

	/* 마우스 움직일때 마다 회전 하도록 구현  */
	document.addEventListener("mousemove", e => {
		mouseX = map(e.clientX, 0, canvas.clientWidth, -1, 1)
		mouseY = map(e.clientY, 0, canvas.clientHeight, 1, -1)
	})

	document.addEventListener("mousedown", e => {
		mousePressed = true
		if (mousePressedInterval == null) {
			mousePressedInterval = window.setInterval(whilePressed, 250)
			whilePressed()
		}
	})
	document.addEventListener("mouseup", e => {
		mousePressed = false
		window.clearInterval(mousePressedInterval)
		mousePressedInterval = null
	})

	updateViewport()

	/* updates the keyTracker, used for keyboard input */
	document.addEventListener("keydown", e => keyTracker[e.code] = true);
	document.addEventListener("keyup", e => keyTracker[e.code] = false);

	/* Generate enemy entities in random locations */
	for (let i = 0; i < numEnemies; i++) {
		// Put enemies outside edges of playable area
		let randX = (Math.random() - 0.6) * 2
		let randY = (Math.random() - 0.6) * 2 // 적들이 날아오는 random location을 더 넓게 설정
		if (randX < 0) {
			randX -= 1.0
		} else {
			randX += 1.0
		}
		if (randY < 0) {
			randY -= 1.0
		} else {
			randY += 1.0
		}
		const sizeFactor = Math.random() * 0.1 + 0.03
		const minVelocity = 0.0003 //최저속도 느리게
		const maxVelocity = 0.002 //최고속도를 느리게 
		const randVelocity = (Math.random() * maxVelocity) + minVelocity
		entities.push(new Enemy(randX, randY, randVelocity, randVelocity, getEnemyShape(sizeFactor), sizeFactor))
	}

	/* Initialize ship */
	entities.push(playerShip = new Ship(0, 0, 0.01, 0.01, getShipShape()))

	/* Render health boxes for entities */
	entities.forEach(entity => {
		let hpBox = document.createElement("div")
		hpBox.style.cssText = `position: absolute; background-color: white; width: 50px; height: 12px; top: 0px; left: 0px; display: none;`
		entity.hpBox = hpBox
		document.getElementById("container").appendChild(hpBox)
	})

	/* Initialize scoreboard */
	let enemyCounterDiv = document.createElement("div")
	enemyCounterDiv.style.cssText = `position: absolute; text-align: center; color: white; font-size: 50px; width: 100%; height: 50px; text-align: center;`
	enemyCounterDiv.innerText = ` The number of enemies: `
	let enemyCounterSpan = document.createElement("span")
	enemyCounterSpan.setAttribute("id", "enemyCounter")
	enemyCounterSpan.innerText = `${numEnemies}`
	enemyCounterDiv.appendChild(enemyCounterSpan)
	document.getElementById("container").appendChild(enemyCounterDiv)
	// window.setInterval(() => {console.log(frames);frames=0}, 1000)

	startTime = new Date().getTime()
		
	/* Render everything */
	render()

	}

function updateViewport() {
	let cW = gl.canvas.clientWidth
	let cH = gl.canvas.clientHeight
	gl.viewport(0, 0, cW, cH)
	if (gl.canvas.width != cW || gl.canvas.height != cH) {
		gl.canvas.width = cW
		gl.canvas.height = cH
	}
	aspectRatio = (cW * 1.0) / cH

	cameraWidth = .5 * Math.sqrt(aspectRatio)
	cameraHeight = .5 / Math.sqrt(aspectRatio)
}

/* Map a value from one range to another, general math utility function */
function map(v, a, b, c, d) {
	return (v - a) / (b - a) * (d - c) + c;
}

function constrain(v, a, b) {
	return Math.min(Math.max(v, a), b)
}

/* Creates a vec3 for each star field point at a random location */
function createStarFieldPoint(ratio) {
	// Get a random number between -1 and 1 for x-coord and y-coord
	const x = (Math.random() * 2 * ratio) - 1 * ratio
	const y = (Math.random() * 2 * ratio) - 1 * ratio
	return vec3(x, y, 1)
}

/* Creates array of star field points */
function createStarFieldLayer(numPoints, viewRatio) {
	let starLayer = []
	for (let i = 0; i < numPoints; i++) {
		const starPoint = createStarFieldPoint(viewRatio)
		starLayer.push(starPoint)
	}
	return starLayer
}

/* Render star field using camera offsets x and y */
function renderStarfield(x, y, zoom, cameraScaleX, cameraScaleY, buffer, numPoints) {
	gl.uniform3f(gl.getUniformLocation(starFieldProgram, "camera"), x, y, zoom)
	gl.uniform2f(gl.getUniformLocation(starFieldProgram, "scaling"), cameraScaleX, cameraScaleY)
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

	let pos = gl.getAttribLocation(starFieldProgram, 'pos')
	gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 0, 0)
	gl.enableVertexAttribArray(pos)

	gl.drawArrays(gl.POINTS, 0, numPoints)
}

function updateCamera() {
	if (!playerShip) return
	cameraX = constrain(playerShip.x, -1.0 + cameraWidth, 1.0 - cameraWidth)
	cameraY = constrain(playerShip.y, -1.0 + cameraHeight, 1.0 - cameraHeight)
}
//제한된 범위내에서 카메라가 마우스와 키보드를 잘 따라가도록 초기화 작업 진행 

function render() {
	requestAnimationFrame(render)

	updateViewport()

	entities.forEach((e) => e.move())

	updateCamera()
	// if(keyTracker['KeyW'])playerShip.x-=0.05

	gl.clear(gl.COLOR_BUFFER_BIT)

	/* Render star fields */
	gl.useProgram(starFieldProgram)
	renderStarfield(-cameraX * .625, -cameraY * .625, 2, 1.0 / cameraWidth, 1.0 / cameraHeight, bufferStarLayer1, starLayer1.length)
	renderStarfield(-cameraX * .75, -cameraY * .75, 2, 1.0 / cameraWidth, 1.0 / cameraHeight, bufferStarLayer2, starLayer2.length)
	renderStarfield(-cameraX * .875, -cameraY * .875, 2, 1.0 / cameraWidth, 1.0 / cameraHeight, bufferStarLayer3, starLayer3.length)

    /*
    Render entities, each entity is responsible for setting the correct program
    
    e - entity
    i - index
    l - list
    */
	entities.forEach((e, i, l) => {
		if (e.isDone()) {
			e.onRemove()
			l.splice(i, 1)
		} else {
			e.render(-cameraX, -cameraY, 1.0 / cameraWidth, 1.0 / cameraHeight, 1)
			// Render health box for entity
			renderHpBox(e, "red")
		}
	})
	frames++

}

class Entity {
	constructor(initialX, initialY, initialXv, initialYv, shapeData) {
		this.x = initialX * 1.0 //convert to float
		this.y = initialY * 1.0 //convert to float
		this.xv = initialXv * 1.0 //convert to float
		this.yv = initialYv * 1.0 //convert to float
		this.points = shapeData
	}
	//return true if this entity should be removed from rendering and deleted (presumably when health is 0)
	isDone() {
		return false
	}
	//if isDone returns true this function is called before removal from the render list
	onRemove() { }
	Restart() { }

	//called each frame to render the entity
	//cameraX, cameraY, cameraScaleX and cameraScaleY is the translation and scaling to apply to each vertex
	//cameraZoom is an extra entity size scaling factor to be applied before translation
	//cameraScaleX and cameraScaleY are for after all other translations
	render(cameraX, cameraY, cameraScaleX, cameraScaleY, cameraZoom) { }

	//update movement
	move() { }

}

class Ship extends Entity {
	constructor(initialX, initialY, initialXv, initialYv, shapeData) {
		super(initialX, initialY, initialXv, initialYv, shapeData)
		this.hpBox = null
		// this.health = 100
		this.colors = initColors(this.points.length, 1, 1, 0.1, 1) //ship의 색상 눈에 잘띄는 노랑색으로 변경
		this.shipBuffer = initBuffer(this.points)
		this.colorBuffer = initBuffer(this.colors)
	}

	move() { //마우스 회전 기능 추가
		counter++
		// Rotation
		const padding = 0.05
		const boundLeft = -1.0 + padding
		const boundRight = 1.0 - padding
		const boundTop = 1.0 - padding
		const boundBottom = -1.0 + padding
		// Move horizontally
		if (keyTracker["KeyA"] == true) {
			// Move left
			const newX = this.x - this.xv
			if (newX < boundLeft) {
				this.x = boundLeft
			} else {
				this.x = newX
			}
		} else if (keyTracker["KeyD"] == true) {
			// Move right
			const newX = this.x + this.xv
			if (newX > boundRight) {
				this.x = boundRight
			} else {
				this.x = newX
			}
		}
		// Move vertically
		if (keyTracker["KeyS"] == true) {
			// Move down
			const newY = this.y - this.yv
			if (newY < boundBottom) {
				this.y = boundBottom
			} else {
				this.y = newY
			}
		} else if (keyTracker["KeyW"] == true) {
			// Move up
			const newY = this.y + this.yv
			if (newY > boundTop) {
				this.y = boundTop
			} else {
				this.y = newY
			}
		}
	}

	isDone() {
		return this.health <= 0
	}

	render(cameraX, cameraY, cameraScaleX, cameraScaleY, cameraZoom) {
		gl.useProgram(program)

		gl.uniform3f(gl.getUniformLocation(program, "camera"), cameraX, cameraY, cameraZoom)
		gl.uniform3f(gl.getUniformLocation(program, "entPos"), this.x, this.y, 0.0)
		gl.uniform2f(gl.getUniformLocation(program, "scaling"), cameraScaleX, cameraScaleY)
		gl.uniform1f(gl.getUniformLocation(program, "angle"), getTheta(this.x, this.y))

		gl.bindBuffer(gl.ARRAY_BUFFER, this.shipBuffer)
		gl.bufferData(gl.ARRAY_BUFFER, flatten(this.points), gl.STATIC_DRAW)
		let pos = gl.getAttribLocation(program, 'pos')
		gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 0, 0)
		gl.enableVertexAttribArray(pos)

		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
		let vertexColor = gl.getAttribLocation(program, "vertColor")
		gl.vertexAttribPointer(vertexColor, 4, gl.FLOAT, false, 0, 0)
		gl.enableVertexAttribArray(vertexColor)

		gl.drawArrays(gl.TRIANGLE_FAN, 0, this.points.length)
	}

	immaFirinMyLasers(x, y) {

		entities.push(new Laser(this.x, this.y, 0.0, 0.0, getLaserShape(), getTheta(this.x, this.y)))

		entities.forEach(e => {
			if (e instanceof Enemy) {
				if (getDistanceFromPointToRay(e.x, e.y, this.x, this.y, x, y) <= e.sizeFactor) e.health -= 10// 적들이 너무 쉽게 죽지 않도록 health값을 더 작게 변경
			}
		})
	}
}

class Enemy extends Entity {
	constructor(initialX, initialY, initialXv, initialYv, shapeData, sizeFactor) {
		super(initialX, initialY, initialXv, initialYv, shapeData)
		this.hpBox = null
		this.sizeFactor = sizeFactor
		this.health = 1500 * this.sizeFactor //적의 수명 결정 - 조금 더 긴 수명으로 설정
		this.colors = initColors(this.points.length, Math.random(), Math.random(), Math.random(), 1)
		this.entityBuffer = initBuffer(this.points)
		this.colorBuffer = initBuffer(this.colors)
	}

	move() {
		const coords = getPlayerCoords()
		const playerX = coords[0]
		const playerY = coords[1]
		const distanceX = this.x - playerX
		const absDistanceX = Math.abs(distanceX)
		const distanceY = this.y - playerY
		const absDistanceY = Math.abs(distanceY)
		// Move enemy left if its position is to the right of the player else move right
		if (distanceX > 0) {
			// If velocity is greater than remaining distance to move to the player, only move the remaining distance
			if (this.xv > absDistanceX) {
				this.x -= absDistanceX + 0.5 //적이 ship에 너무 딱 달라붙지 않도록 수정(원래는 0이었음)
			} else {
				this.x -= this.xv
			}
		} else {
			// If velocity is greater than remaining distance to move to the player, only move the remaining distance
			if (this.xv > absDistanceX) {
				this.x += absDistanceX - 0.5
			} else {
				this.x += this.xv
			}
		}
		// Move enemy down if its position is above the player else move up
		if (distanceY > 0) {
			// If velocity is greater than remaining distance to move to the player, only move the remaining distance
			if (this.yv > absDistanceY) {
				this.y -= absDistanceY + 0.5
			} else {
				this.y -= this.yv
			}
		} else {
			// If velocity is greater than remaining distance to move to the player, only move the remaining distance
			if (this.yv > absDistanceY) {
				this.y += absDistanceY - 0.5
			} else {
				this.y += this.yv
			}
		}
	}

	isDone() {
		return this.health <= 0
	}

	onRemove() {
		if (this.hpBox) this.hpBox.parentElement.removeChild(this.hpBox)
		numEnemies--
		let enemyCounter = document.getElementById("enemyCounter")
		if (!!enemyCounter) {
			if (numEnemies == 0) {
				timeTaken = new Date().getTime() - startTime
				enemyCounter.parentElement.innerText = "You Win!"
				setTimeout(gameOver, 1000)
			} else enemyCounter.innerText = numEnemies
		}
	}
	

	render(cameraX, cameraY, cameraScaleX, cameraScaleY, cameraZoom) {
		gl.useProgram(program)

		gl.uniform3f(gl.getUniformLocation(program, "camera"), cameraX, cameraY, cameraZoom)
		gl.uniform3f(gl.getUniformLocation(program, "entPos"), this.x, this.y, 0.0)
		gl.uniform2f(gl.getUniformLocation(program, "scaling"), cameraScaleX, cameraScaleY)
		gl.uniform1f(gl.getUniformLocation(program, "angle"), 0)

		gl.bindBuffer(gl.ARRAY_BUFFER, this.entityBuffer)
		let pos = gl.getAttribLocation(program, 'pos')
		gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 0, 0)
		gl.enableVertexAttribArray(pos)

		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
		let vertexColor = gl.getAttribLocation(program, "vertColor")
		gl.vertexAttribPointer(vertexColor, 4, gl.FLOAT, false, 0, 0)
		gl.enableVertexAttribArray(vertexColor)

		gl.drawArrays(gl.TRIANGLE_FAN, 0, this.points.length)
	}
}

class Laser extends Entity {
	constructor(initialX, initialY, initialXv, initialYv, shapeData, angle) {
		super(initialX, initialY, initialXv, initialYv, shapeData)
		this.colors = initColors(this.points.length, 0.9, 1.0, 0.0, 1) //레이저 포인터의 색상 노란색으로 변경
		this.pointBuffer = initBuffer(this.points)
		this.colorBuffer = initBuffer(this.colors)
		this.angle = angle
		this.expire = false
		const ref = this
		window.setTimeout(() => ref.expire = true, 100)
	}

	isDone() {
		return this.expire
	}

	render(cameraX, cameraY, cameraScaleX, cameraScaleY, cameraZoom) {
		gl.useProgram(program)

		gl.uniform3f(gl.getUniformLocation(program, "camera"), cameraX, cameraY, cameraZoom)
		gl.uniform3f(gl.getUniformLocation(program, "entPos"), this.x, this.y, 0.0)
		gl.uniform2f(gl.getUniformLocation(program, "scaling"), cameraScaleX, cameraScaleY)
		gl.uniform1f(gl.getUniformLocation(program, "angle"), this.angle)

		gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer)
		let pos = gl.getAttribLocation(program, 'pos')
		gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 0, 0)
		gl.enableVertexAttribArray(pos)

		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
		let vertexColor = gl.getAttribLocation(program, "vertColor")
		gl.vertexAttribPointer(vertexColor, 4, gl.FLOAT, false, 0, 0)
		gl.enableVertexAttribArray(vertexColor)

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.points.length)
	}

}

function initBuffer(arr) {
	newBuffer = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, newBuffer)
	gl.bufferData(gl.ARRAY_BUFFER, flatten(arr), gl.STATIC_DRAW)
	return newBuffer
}

function initColors(numColors, r, g, b, alpha) {
	colors = []
	for (let i = 0; i < numColors; i++) {
		colors.push(vec4(r * 1.0, g * 1.0, b * 1.0, alpha * 1.0))
	}
	return colors
}
function getLaserShape() {
	return [
		vec3(-.002, 0.1, 1.0),
		vec3(.002, 0.1, 1.0),
		vec3(.002, 2.0, 1.0),
		vec3(-.002, 1.0, 1.0)
	]
}

function getShipShape() {
	const h = 0.135
	const d1 = 0.065 // ship의 모양을 조금 더 키운다.(눈에 더 잘 띄도록)

	let p1 = vec3(d1, 0.0, 1.0)
	let p2 = vec3(0, h, 1.0)
	let p3 = vec3(-d1, 0.0, 1.0)
	return [p1, p2, p3]
}

function getEnemyShape(radius) {
	// Generate random shapes with at minimum 4 vertices
	const numPoints = Math.floor(Math.random() * 7) + 4 // 날아오는 적의 모양이 더 다양하도록(꼭짓점의 수 증가시킴) 더 큰 수(6->7)를 곱해줌
	// console.log(`Generating enemy shape with ${numPoints} points.`)
	const angle = 2 * Math.PI / numPoints
	let shapePoints = []
	for (let i = 0; i < numPoints; i++) {
		x = radius * Math.sin(i * angle)
		y = radius * Math.cos(i * angle)
		shapePoints.push(vec3(x, y, 1))
	}
	return shapePoints
}

function getPlayerCoords() {
	return [playerShip.x, playerShip.y]
}

function getTheta(x, y) {
	//mX and mY are the coordinates of the mouse in the playspace rather than in the screen space
	mX = map(
		mouseX,
		-1.0,
		1.0,
		map(cameraX, -1.0 + cameraWidth, 1.0 - cameraWidth, -1.0, 1.0 - cameraWidth * 2.0),
		map(cameraX, -1.0 + cameraWidth, 1.0 - cameraWidth, -1.0 + cameraWidth * 2.0, 1.0)
	)
	mY = map(
		mouseY,
		-1.0,
		1.0,
		map(cameraY, -1.0 + cameraHeight, 1.0 - cameraHeight, -1.0, 1.0 - cameraHeight * 2.0),
		map(cameraY, -1.0 + cameraHeight, 1.0 - cameraHeight, -1.0 + cameraHeight * 2.0, 1.0)
	)
	return Math.atan2(mX - x, mY - y)
}

function renderHpBox(entity, color) {
	if (!("hpBox" in entity) || !("health" in entity)) return

	let left = map(
		entity.x,
		map(cameraX, -1.0 + cameraWidth, 1.0 - cameraWidth, -1.0, 1.0 - cameraWidth * 2.0),
		map(cameraX, -1.0 + cameraWidth, 1.0 - cameraWidth, -1.0 + cameraWidth * 2.0, 1.0),
		0.0,
		100.0
	)
	let top = map(
		entity.y + .05,
		map(cameraY, -1.0 + cameraHeight, 1.0 - cameraHeight, -1.0, 1.0 - cameraHeight * 2.0),
		map(cameraY, -1.0 + cameraHeight, 1.0 - cameraHeight, -1.0 + cameraHeight * 2.0, 1.0),
		100.0,
		0.0,
	)
	// console.log(`Entity: ${JSON.stringify(entity)}\nx: ${entity.x} y: ${entity.y}\nTop: ${top}vh Left: ${left}vw`)
	entity.hpBox.style.cssText = `position: absolute; background-color: ${color}; width: 70px; height: 20px; top: ${top}vh; left: ${left}vw; display: block; transform: translate(-50%, -50%); color: white; text-align: center;`
	entity.hpBox.innerText = `${entity.health.toFixed(0)} hp`
}

function getDistanceFromPointToRay(pX, pY, lx1, ly1, lx2, ly2) {
	let pxr = (pX * 1.0) - (lx1 * 1.0) // point x relative to ray x1
	let pyr = (pY * 1.0) - (ly1 * 1.0) // point y relative to ray y1
	let lxr = (lx2 * 1.0) - (lx1 * 1.0) //  ray x2 relative to ray x1
	let lyr = (ly2 * 1.0) - (ly1 * 1.0) //  ray y2 relative to ray y1
	let a = Math.atan2(lxr, lyr) //angle of ray from point 1
	let fx = (Math.cos(a) * pxr) - (Math.sin(a) * pyr) //point x rotated about the ray's base so the ray points up
	let fy = (Math.sin(a) * pxr) + (Math.cos(a) * pyr) //point y rotated about the ray's base so the ray points up
	if (fy < 0) return Math.sqrt(fx * fx + fy * fy) //if the point is behind the ray return the distance to the ray's base

	return Math.abs(fx) //otherwise return the distance to the line, which since we rotated it is really easy
}

function gameOver() {
	let endScreen = document.createElement("div")
	endScreen.style.cssText = `position: absolute; text-align: center; background-color: #212121; color: #e4e4e4; font-size: 100px; height: 100vh; width: 100vw; display: flex; flex-direction: column; align-items: center; justify-content: center;`
	endScreen.innerText = 'You Win!'
	let score = document.createElement("div")
	score.innerHTML = `Score: ${timeTaken / 1000.0} seconds`
	score.style.margin = "30px 0px"
	endScreen.appendChild(score)
	let restartButton = document.createElement("button")
	restartButton.addEventListener("click", (e) => {
		window.location.reload()
	})
	restartButton.style.cssText = `text-align: center; font-size: 5vh; height: 10vh; width: 40vw;`
	restartButton.innerText = "Restart?"
	endScreen.appendChild(restartButton)
	document.getElementById("container").appendChild(endScreen)
	console.log("game over")
}

//끝
