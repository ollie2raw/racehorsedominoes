"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAck = sendAck;
function sendAck(cb, response) {
    if (typeof cb === "function") {
        cb(response);
    }
}
//# sourceMappingURL=socketAck.js.map