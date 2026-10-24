"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAck = normalizeAck;
function normalizeAck(ack) {
    return typeof ack === "function" ? ack : () => { };
}
//# sourceMappingURL=socketAck.js.map