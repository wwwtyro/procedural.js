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

////////////////////////////////////////////////////////////////////
// Iterator                                                       //
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
// Color Gradient                                                 //
////////////////////////////////////////////////////////////////////

var ColorGradient = function() {
    this.nodes = [];
}

ColorGradient.prototype.insertNode = function(position, r, g, b) {
    var index = 0;
    while (index < this.nodes.length && this.nodes[index].position < position) {
        index++;
    }
    this.nodes.splice(index, 0, {
        position: position,
        r: r,
        g: g,
        b: b
    });
}

ColorGradient.prototype.sample = function(position) {
    // Handle cases:
    //      Left of first
    //      Right of last
    //      No nodes
    var index = 0;
    while (index < this.nodes.length && this.nodes[index].position < position) {
        index++;
    }
    var left = this.nodes[index - 1];
    var right = this.nodes[index];
    var dr = right.position - left.position;
    var slope = {
        r: (right.r - left.r) / dr,
        g: (right.g - left.g) / dr,
        b: (right.b - left.b) / dr
    };
    var delta = position - left.position;
    var r = left.r + slope.r * delta;
    var g = left.g + slope.g * delta;
    var b = left.b + slope.b * delta;
    return {
        r: r,
        g: g,
        b: b
    };
}
////////////////////////////////////////////////////////////////////
// Planet                                                         //
////////////////////////////////////////////////////////////////////

var Planet = function(size) {
    this.size = size;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = size;
    this.context = this.canvas.getContext("2d");
    this.iterator = new XYIterator(size, size);
    this.lx = 1;
    this.ly = -1;
    this.lz = 2;
    var d = Math.sqrt(this.lx * this.lx + this.ly * this.ly + this.lz * this.lz);
    this.lx /= d;
    this.ly /= d;
    this.lz /= d;
    this.pn = new Perlin(Math.random());
    this.cg = new ColorGradient();
    this.cg.insertNode(0, 0, 0, 0.5);
    this.cg.insertNode(0.5, 0, 0, 1);
    this.cg.insertNode(0.65, 0.5, 0.5, 1);
    this.cg.insertNode(0.75, 0.5, 0.5, 0);
    this.cg.insertNode(0.85, 0, 0.8, 0);
    this.cg.insertNode(0.95, 0.5, 0.5, 0.5);
    this.cg.insertNode(1, 1, 1, 1);
}

Planet.prototype.update = function() {
    var next = this.iterator.next();
    if (next.done == 1) {
        return 1;
    }
    var c = this.size * 0.5;
    var x = next.x + 0.5 - c;
    var y = next.y + 0.5 - c;
    var d = Math.sqrt(x * x + y * y);
    if (d < c) {
        var z = Math.sqrt(c * c - x * x - y * y);
        var dx = x / c,
            dy = y / c,
            dz = z / c;
        var dot = dx * this.lx + dy * this.ly + dz * this.lz;
        var scale = 4;
        var i = this.pn.noise(x / this.size * scale, y / this.size * scale, z / this.size * scale) / 1.125;
        var scale = 8;
        i += this.pn.noise(x / this.size * scale, y / this.size * scale, z / this.size * scale) / 4;
        var scale = 16;
        i += this.pn.noise(x / this.size * scale, y / this.size * scale, z / this.size * scale) / 8;
        var scale = 32;
        i += this.pn.noise(x / this.size * scale, y / this.size * scale, z / this.size * scale) / 16;
        i = Math.min(i, 1);
        // i = Math.pow(i, 2);
        var c = this.cg.sample(i);
        this.context.fillStyle = rgba(i * dot * c.r, i * dot * c.g, i * dot * c.b, 1);
        this.context.fillRect(next.x, next.y, 1, 1);
    }
    return next.done;
}

////////////////////////////////////////////////////////////////////
// Application                                                    //
////////////////////////////////////////////////////////////////////

var planet;

function init() {
    planet = new Planet(512);
    document.body.appendChild(planet.canvas);
    planet.canvas.style.position = "fixed";
    planet.canvas.style.top = 16;
    planet.canvas.style.left = 16;
}

function reflow() {}

function update() {
    var t0 = Date.now();
    while (Date.now() - t0 < 20) {
        var done = planet.update();
        if (done == 1) {
            return;
        }
    }
    requestAnimationFrame(update);
}

window.onload = function() {
    init();
    update();
}