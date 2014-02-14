"use strict";

////////////////////////////////////////////////////////////////////
// Utility functions                                              //
////////////////////////////////////////////////////////////////////

var rgba = function(r, g, b, a) {
    r = Math.floor(r * 255);
    g = Math.floor(g * 255);
    b = Math.floor(b * 255);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

var rgbaCanvas = function(width, height, r, g, b, a) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext("2d");
    context.fillStyle = rgba(r, g, b, a);
    context.fillRect(0, 0, width, height);
    return canvas;
}

////////////////////////////////////////////////////////////////////
// Iterator & Renderers                                           //
////////////////////////////////////////////////////////////////////

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

////////////////////////////////////////////////////////////////////

var StarRenderer = function(canvas, r, g, b, x, y, size) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.x = Math.round(x);
    this.y = Math.round(y);
    this.size = size;
    this.context = canvas.getContext("2d");
    this.e = 0.5;
    var E = this.e * 2;
    this.m = Math.pow(this.size, E);
    var d = 0;
    while (this.m / Math.pow(d * d, this.e + (d * d) / 10000) > 0.001) {
        d++;
    }
    this.side = d;
    this.iterator = new XYIterator(this.side * 2, this.side * 2);
}

StarRenderer.prototype.next = function() {
    var next = this.iterator.next();
    var d = Math.pow(next.x - this.side, 2) + Math.pow(next.y - this.side, 2);
    var i = Math.min(1, this.m / Math.pow(d, this.e + d / 10000));
    this.context.fillStyle = rgba(this.r, this.g, this.b, i);
    this.context.fillRect(next.x + this.x - this.side, next.y + this.y - this.side, 1, 1);
    return next.done;
}

////////////////////////////////////////////////////////////////////

var SunRenderer = function(canvas, r, g, b, x, y, size) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.x = x;
    this.y = y;
    this.size = size;
    this.context = canvas.getContext("2d");
    this.iterator = new XYIterator(canvas.width, canvas.height);
    this.e = 1;
    this.m = Math.pow(this.size, this.e * 2);
    this.idata = this.context.getImageData(0, 0, canvas.width, canvas.height).data;
}

SunRenderer.prototype.next = function() {
    var next = this.iterator.next();
    var d = Math.pow(next.x - this.x, 2) + Math.pow(next.y - this.y, 2);
    var raw = this.m / Math.pow(d, this.e);
    var i = Math.min(1, raw);
    var q = raw - i;
    var offset = next.y * this.iterator.width * 4 + next.x * 4;
    var r = this.idata[offset + 0] / 255 + Math.min(1, this.r + q * 2) * i;
    var g = this.idata[offset + 1] / 255 + Math.min(1, this.g + q * 4) * i;
    var b = this.idata[offset + 2] / 255 + Math.min(1, this.b + q * 2) * i;
    this.context.fillStyle = rgba(r, g, b, 1);
    this.context.fillRect(next.x, next.y, 1, 1);
    return next.done;
}

////////////////////////////////////////////////////////////////////

var NebulaRenderer = function(canvas, r, g, b, scale, intensity, falloff) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.scale = scale;
    this.intensity = intensity;
    this.falloff = falloff;
    this.context = canvas.getContext("2d");
    this.pn = new Perlin("" + Math.random());
    this.iterator = new XYIterator(canvas.width, canvas.height);
}

NebulaRenderer.prototype.recursiveField = function(x, y, depth, divisor) {
    if (depth == 0) {
        return this.pn.noise(x / divisor, y / divisor, 0);
    }
    var displace = this.recursiveField(x, y, depth - 1, divisor / 2);
    return this.pn.noise(x / divisor + displace, y / divisor + displace, 0);
}

NebulaRenderer.prototype.field = function(r, g, b, x, y, intensity, falloff) {
    var i = Math.min(1, this.recursiveField(x, y, 5, 2) * intensity);
    i = Math.pow(i, falloff);
    return rgba(r, g, b, i);
}

NebulaRenderer.prototype.next = function() {
    var next = this.iterator.next();
    this.context.fillStyle = this.field(this.r, this.g, this.b, next.x / this.scale, next.y / this.scale, this.intensity, this.falloff);
    this.context.fillRect(next.x, next.y, 1, 1);
    return next.done;
}

////////////////////////////////////////////////////////////////////
// SpaceVista                                                     //
////////////////////////////////////////////////////////////////////

var SpaceVista = function(seed, width, height, renderPointStars, renderStars, renderNebulae, renderSun) {
    this.width = width;
    this.height = height;
    this.seed = seed;
    this.renderStars = renderStars;
    this.renderNebulae = renderNebulae;
    this.renderSun = renderSun;
    this.scale = Math.max(width, height);
    this.initializeSurfaces();
    Math.random = Alea(this.seed);
    if (renderPointStars) {
        this.renderField();
        Math.random = Alea(this.seed);
    }
    this.buildQueue();
}

SpaceVista.prototype.initializeSurfaces = function() {
    this.canvas = rgbaCanvas(this.width, this.height, 0, 0, 0, 1);
    this.ctx = this.canvas.getContext("2d");
}

SpaceVista.prototype.buildQueue = function() {
    this.queueIndex = 0;
    this.queue = [];
    this.op = undefined;
    if (this.renderStars) {
        this.queue.push("star");
        while (Math.random() < 0.95) {
            this.queue.push("star");
        }
    }
    if (this.renderNebulae) {
        this.queue.push("nebula");
        while (Math.random() < 0.5) {
            this.queue.push("nebula");
        }
    }
    if (this.renderSun) {
        this.queue.push("sun");
    }
}

SpaceVista.prototype.getOp = function(opCode) {
    if (opCode == "star") {
        return new StarRenderer(this.canvas, 1, 1, 1, Math.random() * this.width, Math.random() * this.height, Math.random() * 0.001 * this.scale);
    } else if (opCode == "nebula") {
        return new NebulaRenderer(this.canvas, Math.random(), Math.random(), Math.random(), this.scale / 4, Math.random() * 0.2 + 1, Math.random() * 3 + 3);
    } else if (opCode == "sun") {
        var r, g, b;
        if (Math.random() < 0.5) {
            r = 1;
            g = Math.random();
            b = Math.random() * 0.25;
        } else {
            r = Math.random() * 0.25;
            g = Math.random();
            b = 1;
        }
        return new SunRenderer(this.canvas, r, g, b, Math.random() * this.width, Math.random() * this.height, this.scale * (Math.random() * 0.1 + 0.01));
    }
}

SpaceVista.prototype.renderField = function() {
    for (var i = 0; i < this.width * this.height / 512; i++) {
        var x = Math.random() * this.width;
        var y = Math.random() * this.height;
        var c = Math.random();
        this.ctx.fillStyle = rgba(1, 1, 1, c * c * c);
        this.ctx.fillRect(x, y, 1, 1);
    }
}

SpaceVista.prototype.update = function() {
    if (this.op == undefined) {
        if (this.queueIndex == this.queue.length) {
            return {
                op: "done",
                done: 1
            }
        }
        this.op = this.getOp(this.queue[this.queueIndex]);
    }
    var t0 = Date.now()
    var done = 0;
    while (Date.now() - t0 < 20 && done < 1) {
        done = this.op.next();
    }
    if (done == 1) {
        this.op = undefined;
        this.queueIndex++;
    }
    return {
        op: this.queue[this.queueIndex],
        done: done
    };
}

////////////////////////////////////////////////////////////////////
// Application                                                    //
////////////////////////////////////////////////////////////////////

var vista, container, img;

function getWidth() {
    return parseInt(document.getElementById("width").value);
}

function getHeight() {
    return parseInt(document.getElementById("height").value);
}

function getSeed() {
    return document.getElementById("seed").value;
}

function getStars() {
    return document.getElementById("stars").checked;
}

function getPointStars() {
    return document.getElementById("point stars").checked;
}

function getNebulae() {
    return document.getElementById("nebulae").checked;
}

function getSun() {
    return document.getElementById("sun").checked;
}

function randomSeed(value) {
    document.getElementById("seed").value = btoa(Math.floor(Math.random() * 9999999999999)).replace("=", "").replace("=", "");
}

function buildVista() {
    if (vista != undefined) {
        container.removeChild(vista.canvas);
    }
    vista = new SpaceVista(getSeed(), getWidth(), getHeight(), getPointStars(), getStars(), getNebulae(), getSun());
    container.appendChild(vista.canvas);
}

function randomVista() {
    randomSeed();
    onRender();
}

function onRender() {
    img.style.display = "none";
    buildVista();
    reflow();
    update();
}

function init() {
    container = document.getElementById("render container");
    img = document.createElement("img");
    img.style.display = "none";
    container.appendChild(img);
    randomVista();
    window.onresize = reflow;
    document.getElementById("random").onclick = randomVista;
    document.getElementById("render").onclick = onRender;
}

function reflow() {
    var parent = document.getElementById("render container");
    parent.style.position = "fixed";
    parent.style.top = 0;
    parent.style.right = 0;
    parent.style.width = document.body.offsetWidth - document.getElementById("controls").offsetWidth;
    parent.style.height = "100%";
    var scalew = (parent.offsetWidth - 32) / vista.canvas.width;
    var scaleh = (parent.offsetHeight - 32) / vista.canvas.height;
    var scale = scalew < scaleh ? scalew : scaleh;
    var w = vista.canvas.width * scale;
    var h = vista.canvas.height * scale;
    vista.canvas.style.width = w + "px";
    vista.canvas.style.height = h + "px";
    var left = parent.offsetWidth / 2 - w / 2;
    var top = 16;
    vista.canvas.style.left = left;
    vista.canvas.style.top = top;
    vista.canvas.style.position = "absolute";
    vista.canvas.style.boxShadow = "0px 0px 32px #000000";
    img.style.width = vista.canvas.style.width;
    img.style.height = vista.canvas.style.height;
    img.style.left = vista.canvas.style.left;
    img.style.top = vista.canvas.style.top;
    img.style.position = vista.canvas.style.position;
    img.style.boxShadow = vista.canvas.style.boxShadow;
}

function updateActivity() {
    var html = "Rendering ";
    for (var i = vista.queueIndex; i < vista.queue.length; i++) {
        if (vista.queue[i] == "star") {
            while (vista.queue[i + 1] == "star") {
                i++;
            }
            html += "stars" + "<br>";
            continue;
        }
        html += vista.queue[i] + "<br>";
    }
    document.getElementById("activity").innerHTML = html;
}

function update() {
    var result = vista.update();
    if (result.op != "done") {
        updateActivity();
        requestAnimationFrame(update);
    } else {
        document.getElementById("activity").innerHTML = "Rendering complete."
        img.src = vista.canvas.toDataURL();
        img.style.display = "inline";
        vista.canvas.style.display = "none";
    }
}

window.onload = function() {
    init();
    update();
}