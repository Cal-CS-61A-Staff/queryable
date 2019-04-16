import {initializeInterpreter} from "./interpreter.js";

function init() {
    initializeInterpreter("output");
    $("#loadingDiv").hide();
}

$(init);