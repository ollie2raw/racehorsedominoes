"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAck = normalizeAck;
function normalizeAck(cb) {
    return typeof cb === "function" ? cb : () => { };
}
//# sourceMappingURL=socketAck.js.map