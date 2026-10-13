import { init } from "@heyputer/puter.js/src/init.cjs";
import readline from "readline";
import { exec } from "child_process";
import fs from "fs";

// ANSI Color Codes for a beautiful terminal UI
const colors = {
    reset: "\x1b[0m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    bold: "\x1b[1m"
};

const token = process.env.PUTER_TOKEN;
if (!token) {
    console.error(`${colors.red}❌ No token provided! Please run with PUTER_TOKEN="..."${colors.reset}`);
    process.exit(1);
}

const puter = init(token);
let chatHistory = ""; // Memory for the AI

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${colors.cyan}${colors.bold}You ❯ ${colors.reset}`
});

console.clear();
console.log(`${colors.magenta}${colors.bold}====================================================${colors.reset}`);
console.log(`${colors.magenta}${colors.bold}      🤖 ARCH LINUX x CLAUDE FABLE 5.1 CLI       ${colors.reset}`);
console.log(`${colors.magenta}${colors.bold}====================================================${colors.reset}`);
console.log(`${colors.yellow}Commands:${colors.reset}`);
console.log(` ${colors.green}/file <path>${colors.reset}  - Upload/read a text, script, or config file to Claude`);
console.log(` ${colors.green}/cmd <command>${colors.reset} - Run an Arch Linux command and show Claude the output`);
console.log(` ${colors.green}/clear${colors.reset}         - Wipe Claude's memory/chat history`);
console.log(` ${colors.green}/exit${colors.reset}          - Close the dashboard`);
console.log(`${colors.magenta}====================================================${colors.reset}\n`);

rl.prompt();

rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    // Command: /exit
    if (input.toLowerCase() === "/exit") {
        console.log(`${colors.yellow}Goodbye!${colors.reset}`);
        process.exit(0);
    }

    // Command: /clear
    if (input.toLowerCase() === "/clear") {
        chatHistory = "";
        console.clear();
        console.log(`${colors.green}✅ Chat history cleared.${colors.reset}\n`);
        rl.prompt();
        return;
    }

    let promptToSend = input;

    // Command: /file (Read local files)
    if (input.startsWith("/file ")) {
        const filePath = input.replace("/file ", "").trim();
        try {
            const fileContent = fs.readFileSync(filePath, "utf-8");
            console.log(`${colors.green}📄 File loaded (${filePath}). Sending to Claude...${colors.reset}`);
            promptToSend = `I am sharing a file named '${filePath}'. Here are its contents:\n\n${fileContent}\n\nPlease acknowledge you read it and summarize what it is.`;
        } catch (err) {
            console.log(`${colors.red}❌ Error reading file: ${err.message}${colors.reset}`);
            rl.prompt();
            return;
        }
    }

    // Command: /cmd (Execute Arch commands safely)
    else if (input.startsWith("/cmd ")) {
        const command = input.replace("/cmd ", "").trim();
        console.log(`${colors.yellow}⚡ Executing command: ${command}${colors.reset}`);
        
        try {
            const output = await new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) resolve(`ERROR:\n${stderr || error.message}`);
                    else resolve(stdout);
                });
            });
            console.log(`${colors.green}✅ Command executed. Showing output to Claude...${colors.reset}`);
            promptToSend = `I ran the command '${command}' on my Arch Linux system. Here is the terminal output:\n\n${output}\n\nPlease analyze this output for me.`;
        } catch (err) {
            console.log(`${colors.red}❌ Command failed.${colors.reset}`);
            rl.prompt();
            return;
        }
    }

    // Prepare context for the AI
    const fullPrompt = `${chatHistory}\nUser: ${promptToSend}`;

    try {
        process.stdout.write(`${colors.yellow}⏳ Fable 5.1 is thinking...${colors.reset}\r`);
        
        const response = await puter.ai.chat(fullPrompt, { model: "anthropic/claude-fable-5-1" });
        const aiText = typeof response.message.content === 'string' ? response.message.content : response.message.content[0].text;

        // Save to memory so it remembers the conversation
        chatHistory += `\nUser: ${promptToSend}\nClaude: ${aiText}\n`;
        
        // Trim history to prevent API memory overflow (keeps last ~6000 chars)
        if (chatHistory.length > 6000) chatHistory = chatHistory.slice(-6000);

        // Print response
        process.stdout.write("\x1b[2K\r"); // Clear the "thinking" line
        console.log(`${colors.cyan}${colors.bold}Claude ❯ ${colors.reset}${aiText}\n`);
    } catch (error) {
        process.stdout.write("\x1b[2K\r");
        console.error(`${colors.red}❌ API Error: ${error.message || error}${colors.reset}\n`);
    }

    rl.prompt();
});
