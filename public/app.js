var chalkboard = null;
var context = null;
var client = null;
var modeSpan = null;

var isTracing = false;
var mode = "chalk";

const chalkStyle = "white";
const brushStyle = "black";

function initialLoad() {
    chalkboard = document.getElementById("chalkboard");
    context = chalkboard.getContext("2d");
    client = chalkboard.getBoundingClientRect();

    modeSpan = document.getElementById("mode");
    modeSpan.innerHTML = mode;
}

function changeMode(newMode) {
    mode = newMode;
    modeSpan.innerHTML = mode;
}

function setTrace(newTrace) {
    isTracing = newTrace;
}

function traceBoard(event) {
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
            radius = 3;
    }

    const mouseX = event.clientX - client.left;
    const mouseY = event.clientY - client.top;

    context.beginPath();
    context.arc(mouseX, mouseY, radius, 0, 2*Math.PI);
    context.fill();
    context.stroke();
    context.closePath();
}

function clearBoard() {
    const fillStyle = context.fillStyle;
    context.fillStyle = brushStyle;
    context.fillRect(0, 0, chalkboard.width, chalkboard.height);
    context.fillStyle = fillStyle;
}
