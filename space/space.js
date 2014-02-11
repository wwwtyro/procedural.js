"use strict";




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
}

SunRenderer.prototype.next = function() {
    var next = this.iterator.next();
    var d = Math.pow(next.x - this.x, 2) + Math.pow(next.y - this.y, 2);
    var raw = this.m / Math.pow(d, this.e);
    var i = Math.min(1, raw);
    var q = raw - i
    this.context.fillStyle = rgba(Math.min(1, this.r + q * 2), Math.min(1, this.g + q * 4), Math.min(1, this.b + q * 2), i);
    this.context.fillRect(next.x, next.y, 1, 1);
    return next.done;
}




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