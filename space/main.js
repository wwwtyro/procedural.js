var canvas, ops = [],
    op, opMap, scale,
    params, img;

function init() {
    doParams();
    canvas = rgbaCanvas(params.width, params.height, 0, 0, 0, 1);
    img = document.createElement("img");
    document.body.appendChild(img);
    document.body.appendChild(canvas);
    img.style.display = "none";
    onResize();
    scale = Math.max(canvas.width, canvas.height);
    field();
    Math.random = Alea(params.seed);
    ops.push("nebula");
    while (Math.random() < 0.95) {
        ops.push("stars");
    }
    while (Math.random() < 0.5) {
        ops.push("nebula");
    }
    if (Math.random() < 0.75) {
        ops.push("sun");
    }
    opMap = {
        stars: star,
        sun: sun,
        nebula: nebula
    }
    window.onresize = onResize;
    document.getElementById("random").onclick = randomize;
    onResize();
}

function randomize() {
    window.location = "./#" + JSON.stringify({
        width: params.width,
        height: params.height
    });
    window.location.reload();
}

function onResize() {
    var parent = canvas.parentNode;
    var scalew = (parent.offsetWidth - 64) / canvas.width;
    var scaleh = (parent.offsetHeight - 64) / canvas.height;
    var scale = scalew < scaleh ? scalew : scaleh;
    var w = canvas.width * scale;
    var h = canvas.height * scale;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    var left = parent.offsetWidth / 2 - w / 2;
    var top = parent.offsetHeight / 2 - h / 2;
    canvas.style.left = left;
    canvas.style.top = top;
    canvas.style.position = "fixed";
    canvas.style.boxShadow = "0px 0px 32px #000000";
    img.style.width = canvas.style.width;
    img.style.height = canvas.style.height;
    img.style.left = canvas.style.left;
    img.style.top = canvas.style.top;
    img.style.position = canvas.style.position;
    img.style.boxShadow = canvas.style.boxShadow;
}


function doParams() {
    params = {};
    try {
        var hash = decodeURIComponent(window.location.hash);
        params = JSON.parse(hash.replace("#", ""));
    } catch (err) {
        console.log("Failed to parse url hash. Using defaults.");
    }
    params = {
        seed: params.seed || btoa(Math.floor(Math.random() * 9999999999999)).replace("=", "").replace("=", ""),
        width: params.width || 768,
        height: params.height || 384
    }
    window.location.hash = JSON.stringify(params);
}

function field() {
    var ctx = canvas.getContext("2d");
    for (var i = 0; i < canvas.width * canvas.height / 512; i++) {
        var x = Math.random() * canvas.width;
        var y = Math.random() * canvas.height;
        var c = Math.random();
        ctx.fillStyle = rgba(1, 1, 1, c * c * c);
        ctx.fillRect(x, y, 1, 1);
    }
}

function star() {
    return new StarRenderer(canvas, 1, 1, 1, Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 0.001 * scale);
}

function sun() {
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
    return new SunRenderer(canvas, r, g, b, Math.random() * canvas.width, Math.random() * canvas.height, scale * (Math.random() * 0.1 + 0.01));
}

function nebula() {
    return new NebulaRenderer(canvas, Math.random(), Math.random(), Math.random(), scale / 4, Math.random() * 0.2 + 1, Math.random() * 3 + 3);
}

function updateOpsDisplay() {
    var html = "rendering " + ops[0];
    for (var i = 1; i < ops.length; i++) {
        if (ops[i] == "stars" && ops[i - 1] == "stars") {
            continue;
        }
        html = ops[i] + "<br>" + html;
    }
    document.getElementById("activity").innerHTML = html;
}

function render() {
    if (op == undefined) {
        if (ops.length == 0) {
            document.getElementById("activity").innerHTML = "done";
            document.getElementById("activity").style.color = "#00FF00";
            canvas.style.display = "none";
            img.style.display = "inline";
            img.src = canvas.toDataURL();
            return;
        }
        updateOpsDisplay();
        op = opMap[ops.shift()]();
    }
    var t0 = new Date().getTime();
    var done = 0;
    while (new Date().getTime() - t0 < 30 && done < 1) {
        done = op.next();
    }
    if (done == 1) {
        op = undefined;
    }
    requestAnimationFrame(render);
}

window.onload = function() {
    init();
    render();
}