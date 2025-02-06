var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const AssemblyAI = require("assemblyai");
const aai = new AssemblyAI({
    apiKey: '76fe59768f074bd4b3b8cff820da93db',
});
export function AssemblyTranscribe(data) {
    const run = () => __awaiter(this, void 0, void 0, function* () {
        const transcript = yield aai.transcripts.transcribe(data);
        console.log(transcript.text);
        return transcript.text;
    });
    return run();
}
//# sourceMappingURL=transcriber.js.map