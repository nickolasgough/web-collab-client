var chalkboard = null;
var context = null;
var client = null;
var tracing = false;
var mode = "chalk";

const chalkStyle = "white";
const brushStyle = "black";

function load() {
    chalkboard = document.getElementById("chalkboard");
    context = chalkboard.getContext("2d");
    client = chalkboard.getBoundingClientRect();
}

function startTrace() {
    tracing = true;
}

function endTrace() {
    tracing = false;
}

function trace(event) {
    if (!tracing) {
        return;
    }

    switch(mode) {
        case "brush":
            context.fillStyle = brushStyle;
            break;
        default:
            context.fillStyle = chalkStyle;
    }

    const mouseX = event.clientX - client.left;
    const mouseY = event.clientY - client.top;

    context.beginPath();
    context.arc(mouseX, mouseY, 3, 0, 2*Math.PI);
    context.fill();
    context.stroke();
    context.closePath();
}

function clear() {
    const fillStyle = context.fillStyle;
    context.fillStyle = brushStyle;
    context.fillRect(0, 0, chalkboard.height, chalkboard.width);
    context.fillStyle = fillStyle;
}
