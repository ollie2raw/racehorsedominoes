"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAck = sendAck;
function sendAck(cb, payload) {
    if (typeof cb === "function") {
        cb(payload);
    }
}
//# sourceMappingURL=socketAck.js.map