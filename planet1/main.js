"use strict";

////////////////////////////////////////////////////////////////////////////////
// Utility functions                                                          //
////////////////////////////////////////////////////////////////////////////////

var rgba = function(r, g, b, a) {
    r = Math.floor(r * 255);
    g = Math.floor(g * 255);
    b = Math.floor(b * 255);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
};

var normalRGBA = function(x, y, z) {
    return {
        r: x / 2 + 0.5,
        g: y / 2 + 0.5,
        b: z / 2 + 0.5
    }
};

var smootherstep = function(t) {
    return 6 * Math.pow(t, 5) - 15 * Math.pow(t, 4) + 10 * Math.pow(t, 3);
};

var sphereMap = function(u, v) {
    /*  Returns the 3D cartesian coordinate of a point on
        a sphere that corresponds to the given u,v coordinate. */
    var azimuth = 2 * Math.PI * u;
    var inclination = Math.PI * v;
    var x = Math.sin(inclination) * Math.cos(azimuth);
    var y = Math.sin(inclination) * Math.sin(azimuth);
    var z = Math.cos(inclination);
    return {
        x: x,
        y: y,
        z: z
    };
};

var datColor = function(color) {
    var s = color.replace("#", "");
    return {
        r: parseInt(s.slice(0, 2), 16) / 255,
        g: parseInt(s.slice(2, 4), 16) / 255,
        b: parseInt(s.slice(4, 6), 16) / 255
    }
};

var randomSeed = function() {
    return btoa(Math.floor(Math.random() * 9999999999999)).replace("=", "").replace("=", "");
}

////////////////////////////////////////////////////////////////////////////////
// PixelSurface                                                               //
////////////////////////////////////////////////////////////////////////////////

var PixelSurface = function(width, height) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context = this.canvas.getContext('2d');
    this.imageData = this.context.getImageData(0, 0, this.width, this.height);
    this.pixels = this.imageData.data;
}

PixelSurface.prototype.setPixel = function(x, y, r, g, b, a) {
    var i = 4 * (y * this.width + x);
    this.pixels[i + 0] = r * 256 << 0;
    this.pixels[i + 1] = g * 256 << 0;
    this.pixels[i + 2] = b * 256 << 0;
    this.pixels[i + 3] = a * 256 << 0;
}

PixelSurface.prototype.update = function() {
    this.context.putImageData(this.imageData, 0, 0);
}

////////////////////////////////////////////////////////////////////////////////
// Trackball                                                                  //
////////////////////////////////////////////////////////////////////////////////

var Trackball = function(element, mesh) {
    this.element = element;
    this.buttonDown = false;
    this.mesh = mesh;
    this.lastX = 0;
    this.lastY = 0;
    this.element.addEventListener("mousedown", this.onMousedown.bind(this));
    window.addEventListener("mouseup", this.onMouseup.bind(this));
    window.addEventListener("mousemove", this.onMousemove.bind(this));
};

Trackball.prototype.onMousedown = function(e) {
    this.buttonDown = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
};

Trackball.prototype.onMouseup = function(e) {
    this.buttonDown = false;
};

Trackball.prototype.onMousemove = function(e) {
    if (!this.buttonDown) {
        return;
    }
    var dx = e.clientX - this.lastX;
    var dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.track(dx, dy);
};

Trackball.prototype.track = function(dx, dy) {
    var tempMat = new THREE.Matrix4();
    // base this on the size of the canvas
    tempMat.makeRotationAxis(new THREE.Vector3(0, 1, 0), dx * 0.005);
    tempMat.multiply(this.mesh.matrix);
    var tempMat2 = new THREE.Matrix4();
    // base this on the size of the canvas
    tempMat2.makeRotationAxis(new THREE.Vector3(1, 0, 0), dy * 0.005);
    tempMat2.multiply(tempMat);
    this.mesh.rotation.setFromRotationMatrix(tempMat2);
};

Trackball.prototype.release = function() {
    this.element.removeEventListener("mousedown", this.onMousedown.bind(this));
    window.removeEventListener("mouseup", this.onMouseup.bind(this));
    window.removeEventListener("mousemove", this.onMousemove.bind(this));
}

////////////////////////////////////////////////////////////////////////////////
// Noise                                                                      //
////////////////////////////////////////////////////////////////////////////////

var Noise = function(params) {
    params = params || {};
    this.seed = params.seed || this.randomSeed();
    this.iScale = params.iScale || 1;
    this.iOctaves = params.iOctaves || 1;
    this.iFalloff = params.iFalloff || 1;
    this.iIntensity = params.iIntensity || 1;
    this.iRidginess = params.iRidginess || 0;
    this.sScale = params.sScale || 1;
    this.sOctaves = params.sOctaves || 0;
    this.sFalloff = params.sFalloff || 1;
    this.sIntensity = params.sIntensity || 1;
    this.perlin = new Perlin(this.seed);
    this.noise = this.perlin.noise;
}

Noise.prototype.randomSeed = function() {
    return btoa(Math.floor(Math.random() * 9999999999999)).replace("=", "").replace("=", "");
}

Noise.prototype.octave = function(x, y, z, octaves) {
    var val = 0;
    var scale = 1;
    for (var i = 0; i < octaves; i++) {
        val += this.noise(x * scale, y * scale, z * scale) / scale;
        scale *= 2;
    }
    return val;
}

Noise.prototype.normalizedOctave = function(x, y, z, octaves) {
    var q = 2 - 1 / Math.pow(2, octaves - 1);
    return this.octave(x, y, z, octaves) / q;
}

Noise.prototype.ridgify = function(val) {
    return 1 - 2 * Math.abs(val - 0.5);
}

Noise.prototype.sample = function(x, y, z, params) {
    var offset = 0;
    if (this.sOctaves > 0) {
        offset = this.octave(x / this.sScale,
            y / this.sScale,
            z / this.sScale,
            this.sOctaves);
        offset = Math.pow(offset, this.sFalloff);
        offset = offset * this.sIntensity;
    }
    var val = this.normalizedOctave(x / this.iScale + offset,
        y / this.iScale + offset,
        z / this.iScale + offset,
        this.iOctaves);
    if (this.iRidginess > 0) {
        var ridge = this.normalizedOctave(x / this.iScale + offset,
            y / this.iScale + offset,
            z / this.iScale + offset + 11,
            this.iOctaves);
        val = this.iRidginess * this.ridgify(ridge) + (1 - this.iRidginess) * val;
    }
    val = Math.pow(val, this.iFalloff);
    val = Math.max(0, Math.min(1, val * this.iIntensity));
    return val;
}

////////////////////////////////////////////////////////////////////////////////
// Iterator                                                                   //
////////////////////////////////////////////////////////////////////////////////

var XYIterator = function(width, height) {
    this.width = width;
    this.height = height;
    this.x = -1;
    this.y = 0;
}

XYIterator.prototype.next = function() {
    if (this.y == this.height) {
        return {
            x: this.width - 1,
            y: this.width - 1,
            done: 1
        };
    }
    this.x++;
    if (this.x == this.width) {
        this.x = 0;
        this.y++;
    }
    if (this.y == this.height) {
        return {
            x: this.width - 1,
            y: this.width - 1,
            done: 1
        };
    }
    return {
        x: this.x,
        y: this.y,
        done: (this.y * this.width + this.x) / (this.width * this.height)
    };
}

////////////////////////////////////////////////////////////////////////////////
// Planet Texture Renderer                                                    //
////////////////////////////////////////////////////////////////////////////////

var PlanetTexture = function(params) {
    this.params = params;
    this.width = params.width;
    this.height = params.width / 2;
    this.iterator = new XYIterator(this.width, this.height);
    this.diffuse = new PixelSurface(this.width, this.height);
    this.normal = new PixelSurface(this.width, this.height);
    this.specular = new PixelSurface(this.width, this.height);
    this.cloud = new PixelSurface(this.width, this.height);
    this.done = false;
}

PlanetTexture.prototype.surfaceHeight = function(x, y, z) {
    return this.params.surfaceNoise.sample(x / this.params.spin, y / this.params.spin, z);
}

PlanetTexture.prototype.surfaceColor = function(x, y, z) {
    var c = this.params.landNoise.sample(
        x / this.params.spin,
        y / this.params.spin,
        z
    );
    var q0 = c;
    var q1 = 1 - c;
    var r = this.params.landColor1.r * q0 + this.params.landColor2.r * q1;
    var g = this.params.landColor1.g * q0 + this.params.landColor2.g * q1;
    var b = this.params.landColor1.b * q0 + this.params.landColor2.b * q1;
    return {
        r: r,
        g: g,
        b: b
    };
}

PlanetTexture.prototype.update = function() {
    if (this.done) {
        return;
    }
    var next = this.iterator.next();
    var p0 = sphereMap(next.x / (this.width - 1), next.y / (this.height - 1));
    var c0 = this.surfaceHeight(p0.x, p0.y, p0.z);
    var dr = 0.01;
    if (c0 > this.params.waterLevel) {
        var c = this.surfaceColor(p0.x, p0.y, p0.z);
        this.diffuse.setPixel(next.x, next.y, c.r, c.g, c.b, 1);
        this.specular.setPixel(next.x, next.y, 0, 0, 0, 1);
        var px = sphereMap((next.x + dr) / (this.width - 1), next.y / (this.height - 1));
        var py = sphereMap(next.x / (this.width - 1), (next.y + dr) / (this.height - 1));
        var cx = this.surfaceHeight(px.x, px.y, px.z);
        var cy = this.surfaceHeight(py.x, py.y, py.z);
        var n = $V([dr / (this.width - 1), 0, (cx - c0)]).cross($V([0, dr / (this.height - 1), (cy - c0)])).toUnitVector();
        var rgb = normalRGBA(n.elements[0], -n.elements[1], n.elements[2]);
        this.normal.setPixel(next.x, next.y, rgb.r, rgb.g, rgb.b, 1);
    } else {
        var q1 = smootherstep(Math.pow(c0 / this.params.waterLevel, this.params.waterFalloff));
        var q0 = 1 - q1;
        var rgb = {
            r: this.params.waterDeep.r * q0 + this.params.waterShallow.r * q1,
            g: this.params.waterDeep.g * q0 + this.params.waterShallow.g * q1,
            b: this.params.waterDeep.b * q0 + this.params.waterShallow.b * q1
        }
        this.diffuse.setPixel(next.x, next.y, rgb.r, rgb.g, rgb.b, 1);
        this.specular.setPixel(
            next.x, next.y,
            this.params.waterSpecular,
            this.params.waterSpecular,
            this.params.waterSpecular,
            1);
        var rgb = normalRGBA(0, 0, 1);
        this.normal.setPixel(next.x, next.y, rgb.r, rgb.g, rgb.b, 1);
    }
    var i = this.params.cloudNoise.sample(p0.x / this.params.spin, p0.y / this.params.spin, p0.z) * this.params.cloudOpacity;
    this.cloud.setPixel(
        next.x, next.y,
        this.params.cloudColor.r,
        this.params.cloudColor.g,
        this.params.cloudColor.b, i);
    if ((next.x == this.width - 1 && next.y % 32 == 0) || next.done == 1) {
        this.diffuse.update();
        this.normal.update();
        this.specular.update();
        this.cloud.update();
    }
    this.done = next.done == 1;
}

////////////////////////////////////////////////////////////////////////////////
// Planet Renderer                                                            //
////////////////////////////////////////////////////////////////////////////////

var PlanetRenderer = function(planetTexture) {
    this.planetTexture = planetTexture;
    this.renderer = null;
    this.camera = null;
    this.scene = null;
    this.planet = null;
    this.planetMesh = null;
    this.cloudMesh = null;
    this.canvas = null;
    this.diffuse = null
    this.specular = null;
    this.normal = null;
    this.cloud = null;

    this.canvas = document.createElement('canvas');

    this.camera = new THREE.PerspectiveCamera(61, 1, 0.1, 10);
    this.camera.position.set(0, 0, 2);
    this.scene = new THREE.Scene();
    this.planet = new THREE.Object3D();
    this.scene.add(this.planet);

    var material = new THREE.MeshPhongMaterial({
        color: 0xffffff
    });

    this.planetMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 5), material);
    this.planet.add(this.planetMesh);

    this.cloudMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.001, 5), material);
    this.planet.add(this.cloudMesh);

    var light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 0, 1);
    this.scene.add(light);

    this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        preserveDrawingBuffer: true,
        antialias: true,
        alpha: true
    });
};

PlanetRenderer.prototype.setTexture = function(planetTexture) {
    this.diffuse = new THREE.Texture(planetTexture.diffuse.canvas);
    this.diffuse.wrapS = THREE.RepeatWrapping;
    this.normal = new THREE.Texture(planetTexture.normal.canvas);
    this.normal.wrapS = THREE.RepeatWrapping;
    this.specular = new THREE.Texture(planetTexture.specular.canvas);
    this.specular.wrapS = THREE.RepeatWrapping;
    var material = new THREE.MeshPhongMaterial({
        map: this.diffuse,
        normalMap: this.normal,
        specularMap: this.specular,
        normalScale: new THREE.Vector2(8, 8),
        specular: 0x777777,
        shininess: 16,
        metal: false
    });
    this.planetMesh.material = material;

    this.cloud = new THREE.Texture(planetTexture.cloud.canvas);
    this.cloud.wrapS = THREE.RepeatWrapping;
    var material = new THREE.MeshPhongMaterial({
        map: this.cloud,
        transparent: true,
        specular: 0x000000,
    });
    this.cloudMesh.material = material;
}

PlanetRenderer.prototype.updateTexture = function(planetTexture) {
    this.diffuse.needsUpdate = true;
    this.normal.needsUpdate = true;
    this.specular.needsUpdate = true;
    this.cloud.needsUpdate = true;
}

PlanetRenderer.prototype.render = function() {
    this.renderer.render(this.scene, this.camera);
}

PlanetRenderer.prototype.setSize = function(width, height) {
    this.renderer.setSize(width, height);
}

PlanetRenderer.prototype.setNormalScale = function(s) {
    this.planetMesh.material.normalScale = new THREE.Vector2(s, s);
}

PlanetRenderer.prototype.toDataURL = function(width, height) {
    var oldWidth = this.canvas.width;
    var oldHeight = this.canvas.height;
    this.setSize(width, height);
    this.render();
    var data = this.canvas.toDataURL();
    this.setSize(oldWidth, oldHeight);
    return data;
}

////////////////////////////////////////////////////////////////////////////////
// Controls                                                                   //
////////////////////////////////////////////////////////////////////////////////

var Controls = function(app) {
    this.seed = randomSeed();
    this.randomize = function() {
        this.seed = randomSeed();
        this.render();
    }
    this.resolution = 512;
    this.spin = 1;

    this.surfaceiScale = 2;
    this.surfaceiOctaves = 8;
    this.surfaceiFalloff = 1;
    this.surfaceiIntensity = 1;
    this.surfaceiRidginess = 0.5;
    this.surfacesScale = 1;
    this.surfacesOctaves = 0;
    this.surfacesFalloff = 1;
    this.surfacesIntensity = 1;

    this.landColor1 = "#e6af7e";
    this.landColor2 = "#007200";
    this.landiScale = 2;
    this.landiOctaves = 1;
    this.landiFalloff = 1;
    this.landiIntensity = 1;
    this.landiRidginess = 0;
    this.landsScale = 2;
    this.landsOctaves = 0;
    this.landsFalloff = 1;
    this.landsIntensity = 1;

    this.waterDeep = "#000055";
    this.waterShallow = "#0000ff";
    this.waterLevel = 0.68;
    this.waterSpecular = 1;
    this.waterFalloff = 1;

    this.cloudColor = "#ffffff";
    this.cloudOpacity = 1;
    this.cloudiScale = 0.5;
    this.cloudiOctaves = 2;
    this.cloudiFalloff = 2;
    this.cloudiIntensity = 1.8;
    this.cloudiRidginess = 0;
    this.cloudsScale = 0.5;
    this.cloudsOctaves = 5;
    this.cloudsFalloff = 1;
    this.cloudsIntensity = 1;
    this.render = function() {
        app.deconstruct();
        app.construct();
    }
    this.normalScale = 0.05;
    this.animate = true;
    this.spriteResolution = 512;
    this.renderSprite = function() {
        app.renderSprite();
    }
}

////////////////////////////////////////////////////////////////////////////////
// Application                                                                //
////////////////////////////////////////////////////////////////////////////////

var Application = function() {
    this.controls = new Controls(this);
    this.gui = new dat.GUI({
        autoPlace: false
    });
    this.gui.add(this.controls, 'seed').listen();
    this.gui.add(this.controls, 'randomize');
    this.gui.add(this.controls, 'resolution', [64, 128, 256, 512, 1024, 2048, 4096]);
    this.gui.add(this.controls, 'spin', 1, 8);
    this.gui.surface = this.gui.addFolder('Surface');
    this.gui.surface.noise = this.gui.surface.addFolder('noise');
    this.gui.surface.noise.add(this.controls, 'surfaceiScale', 0.1, 16).name('scale');
    this.gui.surface.noise.add(this.controls, 'surfaceiOctaves', 1, 8).step(1).name('octaves');
    this.gui.surface.noise.add(this.controls, 'surfaceiFalloff', 0, 16).step(0.01).name('falloff');
    this.gui.surface.noise.add(this.controls, 'surfaceiIntensity', 0, 16).name('intensity');
    this.gui.surface.noise.add(this.controls, 'surfaceiRidginess', 0, 1).step(0.01).name('ridginess');
    this.gui.surface.noise.add(this.controls, 'surfacesScale', 0.1, 16).name('smear scale');
    this.gui.surface.noise.add(this.controls, 'surfacesOctaves', 0, 8).step(1).name('smear octaves');
    this.gui.surface.noise.add(this.controls, 'surfacesFalloff', 0, 16).step(0.01).name('smear falloff');
    this.gui.surface.noise.add(this.controls, 'surfacesIntensity', 0, 16).name('smear intensity');

    this.gui.land = this.gui.addFolder('Land');
    this.gui.land.noise = this.gui.land.addFolder('noise');
    this.gui.land.noise.add(this.controls, 'landiScale', 0.1, 16).name('scale');
    this.gui.land.noise.add(this.controls, 'landiOctaves', 1, 8).step(1).name('octaves');
    this.gui.land.noise.add(this.controls, 'landiFalloff', 0, 16).step(0.01).name('falloff');
    this.gui.land.noise.add(this.controls, 'landiIntensity', 0, 16).name('intensity');
    this.gui.land.noise.add(this.controls, 'landiRidginess', 0, 1).step(0.01).name('ridginess');
    this.gui.land.noise.add(this.controls, 'landsScale', 0.1, 16).name('smear scale');
    this.gui.land.noise.add(this.controls, 'landsOctaves', 0, 8).step(1).name('smear octaves');
    this.gui.land.noise.add(this.controls, 'landsFalloff', 0, 16).step(0.01).name('smear falloff');
    this.gui.land.noise.add(this.controls, 'landsIntensity', 0, 16).name('smear intensity');
    this.gui.land.addColor(this.controls, 'landColor1').name('color 1');
    this.gui.land.addColor(this.controls, 'landColor2').name('color 2');

    this.gui.water = this.gui.addFolder('Water')
    this.gui.water.addColor(this.controls, 'waterDeep').name("deep");
    this.gui.water.addColor(this.controls, 'waterShallow').name('shallow');
    this.gui.water.add(this.controls, 'waterLevel', 0.0, 1.0).name('level');
    this.gui.water.add(this.controls, 'waterSpecular', 0.0, 1.0).name('specular');
    this.gui.water.add(this.controls, 'waterFalloff', 0.1, 16).name('falloff');

    this.gui.clouds = this.gui.addFolder('Clouds');
    this.gui.clouds.noise = this.gui.clouds.addFolder('noise');
    this.gui.clouds.noise.add(this.controls, 'cloudiScale', 0.1, 16).name('scale');
    this.gui.clouds.noise.add(this.controls, 'cloudiOctaves', 1, 8).step(1).name('octaves');
    this.gui.clouds.noise.add(this.controls, 'cloudiFalloff', 0, 16).step(0.01).name('falloff');
    this.gui.clouds.noise.add(this.controls, 'cloudiIntensity', 0, 16).name('intensity');
    this.gui.clouds.noise.add(this.controls, 'cloudiRidginess', 0, 1).step(0.01).name('ridginess');
    this.gui.clouds.noise.add(this.controls, 'cloudsScale', 0.1, 16).name('smear scale');
    this.gui.clouds.noise.add(this.controls, 'cloudsOctaves', 0, 8).step(1).name('smear octaves');
    this.gui.clouds.noise.add(this.controls, 'cloudsFalloff', 0, 16).step(0.01).name('smear falloff');
    this.gui.clouds.noise.add(this.controls, 'cloudsIntensity', 0, 16).name('smear intensity');
    this.gui.clouds.addColor(this.controls, 'cloudColor').name('color');
    this.gui.clouds.add(this.controls, 'cloudOpacity', 0.0, 1.0).name('opacity');

    this.gui.add(this.controls, 'render');
    this.gui.add(this.controls, "normalScale", 0, 0.3).step(0.01).name('normal scale').onChange(function() {
        this.planetRenderer.setNormalScale(this.controls.normalScale);
    }.bind(this));
    this.gui.add(this.controls, 'animate');
    this.gui.add(this.controls, 'spriteResolution', 16, 4096).step(1).name('sprite resolution');
    this.gui.add(this.controls, 'renderSprite').name('render sprite');
    document.body.appendChild(this.gui.domElement);

    this.images = []
    for (var i = 0; i < 4; i++) {
        var img = document.createElement('img');
        this.images.push(img);
        document.body.appendChild(img);
    }

    this.sprite = document.createElement('img');
    document.body.appendChild(this.sprite);

    this.planetTexture = null;
    this.planetRenderer = new PlanetRenderer();
    this.construct();

    window.addEventListener("resize", this.arrangeElements.bind(this), false);
};

Application.prototype.deconstruct = function() {
    document.body.removeChild(this.planetTexture.diffuse.canvas)
    document.body.removeChild(this.planetTexture.normal.canvas);
    document.body.removeChild(this.planetTexture.specular.canvas);
    document.body.removeChild(this.planetTexture.cloud.canvas);
    this.trackball.release();
}

Application.prototype.construct = function() {
    Math.random = Alea(this.controls.seed);
    var surfaceNoise = new Noise({
        iScale: this.controls.surfaceiScale,
        iOctaves: this.controls.surfaceiOctaves,
        iFalloff: this.controls.surfaceiFalloff,
        iIntensity: this.controls.surfaceiIntensity,
        iRidginess: this.controls.surfaceiRidginess,
        sScale: this.controls.surfacesScale,
        sOctaves: this.controls.surfacesOctaves,
        sFalloff: this.controls.surfacesFalloff,
        sIntensity: this.controls.surfacesIntensity,
    });
    var landNoise = new Noise({
        iScale: this.controls.landiScale,
        iOctaves: this.controls.landiOctaves,
        iFalloff: this.controls.landiFalloff,
        iIntensity: this.controls.landiIntensity,
        iRidginess: this.controls.landiRidginess,
        sScale: this.controls.landsScale,
        sOctaves: this.controls.landsOctaves,
        sFalloff: this.controls.landsFalloff,
        sIntensity: this.controls.landsIntensity,
    });
    var cloudNoise = new Noise({
        iScale: this.controls.cloudiScale,
        iOctaves: this.controls.cloudiOctaves,
        iFalloff: this.controls.cloudiFalloff,
        iIntensity: this.controls.cloudiIntensity,
        iRidginess: this.controls.cloudiRidginess,
        sScale: this.controls.cloudsScale,
        sOctaves: this.controls.cloudsOctaves,
        sFalloff: this.controls.cloudsFalloff,
        sIntensity: this.controls.cloudsIntensity,
    });

    this.planetTexture = new PlanetTexture({
        width: parseInt(this.controls.resolution),
        waterDeep: datColor(this.controls.waterDeep),
        waterShallow: datColor(this.controls.waterShallow),
        waterLevel: this.controls.waterLevel,
        waterSpecular: this.controls.waterSpecular,
        waterFalloff: this.controls.waterFalloff,
        surfaceNoise: surfaceNoise,
        landColor1: datColor(this.controls.landColor1),
        landColor2: datColor(this.controls.landColor2),
        landNoise: landNoise,
        cloudColor: datColor(this.controls.cloudColor),
        cloudOpacity: this.controls.cloudOpacity,
        cloudNoise: cloudNoise,
        spin: this.controls.spin,
    });
    var d = document.body.appendChild(this.planetTexture.diffuse.canvas);
    var n = document.body.appendChild(this.planetTexture.normal.canvas);
    var s = document.body.appendChild(this.planetTexture.specular.canvas);
    var c = document.body.appendChild(this.planetTexture.cloud.canvas);
    this.planetRenderer.setTexture(this.planetTexture);
    this.planetRenderer.setNormalScale(this.controls.normalScale);
    document.body.appendChild(this.planetRenderer.canvas)
    this.trackball = new Trackball(this.planetRenderer.canvas, this.planetRenderer.planet);
    this.hideImages();
    this.arrangeElements();
}

Application.prototype.arrangeElements = function() {
    this.gui.domElement.style.position = "absolute";
    this.gui.domElement.style.top = 16;
    this.gui.domElement.style.left = 16;

    var textures = [
        this.planetTexture.diffuse.canvas,
        this.planetTexture.normal.canvas,
        this.planetTexture.specular.canvas,
        this.planetTexture.cloud.canvas
    ];
    for (var i = 0; i < 4; i++) {
        var q = textures[i];
        q.style.position = 'absolute';
        q.style.width = 256;
        q.style.height = 128;
        q.style.left = 16 + 245 + 16;
        q.style.top = 16 + 16 * i + 128 * i;
        var p = this.images[i];
        p.style.position = q.style.position;
        p.style.width = q.style.width;
        p.style.height = q.style.height;
        p.style.left = q.style.left;
        p.style.top = q.style.top;
    }

    this.sprite.style.position = 'absolute';
    this.sprite.style.left = 16 + 245 + 16;
    this.sprite.style.top = 16 + 16 * 4 + 128 * 4;
    this.sprite.style.width = 256;
    this.sprite.style.height = 256;

    var q = this.planetRenderer.canvas;
    q.style.position = 'fixed';
    var leftoverw = window.innerWidth - (245 + 256 + 16 * 2);
    var leftoverh = window.innerHeight;
    var size = Math.min(leftoverw - 32, leftoverh - 32);
    this.planetRenderer.setSize(size, size);
    q.style.top = 16;
    q.style.right = leftoverw / 2 - size / 2;

    document.body.style.height = 128 * 4 + 256 + 16 * 6;
}

Application.prototype.showImages = function() {
    var textures = [
        this.planetTexture.diffuse.canvas,
        this.planetTexture.normal.canvas,
        this.planetTexture.specular.canvas,
        this.planetTexture.cloud.canvas
    ];
    for (var i = 0; i < 4; i++) {
        var q = textures[i];
        var p = this.images[i];
        q.style.display = 'none';
        p.style.display = 'block';
        p.src = q.toDataURL();
    }
}

Application.prototype.hideImages = function() {
    var textures = [
        this.planetTexture.diffuse.canvas,
        this.planetTexture.normal.canvas,
        this.planetTexture.specular.canvas,
        this.planetTexture.cloud.canvas
    ];
    for (var i = 0; i < 4; i++) {
        var q = textures[i];
        var p = this.images[i];
        q.style.display = 'block';
        p.style.display = 'none';
    }
}

Application.prototype.renderSprite = function() {
    this.sprite.src = this.planetRenderer.toDataURL(this.controls.spriteResolution,
        this.controls.spriteResolution);
}

Application.prototype.update = function() {
    if (!this.planetTexture.done) {
        var t0 = Date.now();
        while (!this.planetTexture.done && Date.now() - t0 < 20) {
            this.planetTexture.update();
        }
        if (this.planetTexture.done) {
            this.planetRenderer.updateTexture();
            this.showImages();
            this.renderSprite();
        }
    }
    if (this.controls.animate) {
        this.planetRenderer.planetMesh.rotation.y += 0.001;
        this.planetRenderer.cloudMesh.rotation.y += 0.002;
    }
    this.planetRenderer.render();
    requestAnimationFrame(this.update.bind(this));
}

var app;
window.onload = function() {
    app = new Application();
    app.update();
}