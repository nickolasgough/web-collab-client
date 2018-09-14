var chalkboard = null;
var context = null;
var client = null;
var isTracing = false;
var mode = "chalk";

const chalkStyle = "white";
const brushStyle = "black";

function load() {
    chalkboard = document.getElementById("chalkboard");
    context = chalkboard.getContext("2d");
    client = chalkboard.getBoundingClientRect();
}

function changeMode(newMode) {
    mode = newMode;
}

function setTrace(newTrace) {
    isTracing = newTrace;
}

function trace(event) {
    if (!isTracing) {
        return;
    }

    var radius = 0;
    switch(mode) {
        case "brush":
            context.fillStyle = brushStyle;
            radius = 30;
            break;
        default:
            context.fillStyle = chalkStyle;
            radius = 2;
    }

    const mouseX = event.clientX - client.left;
    const mouseY = event.clientY - client.top;

    context.beginPath();
    context.arc(mouseX, mouseY, radius, 0, 2*Math.PI);
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
