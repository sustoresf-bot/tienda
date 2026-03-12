import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEAM_DIR = '.antigravity/team';

function initTeam() {
    // Crear carpetas
    fs.mkdirSync(path.join(TEAM_DIR, 'mailbox'), { recursive: true });
    fs.mkdirSync(path.join(TEAM_DIR, 'locks'), { recursive: true });

    // Crear tasks.json si no existe
    const tasksPath = path.join(TEAM_DIR, 'tasks.json');
    if (!fs.existsSync(tasksPath)) {
        fs.writeFileSync(tasksPath, JSON.stringify({ tasks: [] }, null, 2));
    }

    // Crear broadcast.msg si no existe
    const broadcastPath = path.join(TEAM_DIR, 'broadcast.msg');
    if (!fs.existsSync(broadcastPath)) {
        fs.writeFileSync(broadcastPath, '');
    }
    console.log("✓ Infraestructura 'Equipo Alejabot' inicializada en JS (ESM).");
}

function assignTask(title, assignedTo, depsStr = "") {
    const tasksPath = path.join(TEAM_DIR, 'tasks.json');
    const deps = depsStr ? depsStr.split(',').map(d => d.trim()).filter(d => d) : [];
    
    const data = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
    const taskId = data.tasks.length + 1;
    
    const task = {
        id: taskId,
        title: title,
        status: "PENDING",
        assigned_to: assignedTo,
        dependencies: deps
    };
    
    data.tasks.push(task);
    fs.writeFileSync(tasksPath, JSON.stringify(data, null, 2));
    console.log(`✓ Tarea ${taskId} asignada a ${assignedTo}.`);
}

function broadcast(mensaje) {
    const msg = { de: "Director", tipo: "BROADCAST", mensaje: mensaje };
    fs.appendFileSync(path.join(TEAM_DIR, 'broadcast.msg'), JSON.stringify(msg) + "\n");
    console.log("✓ Broadcast enviado.");
}

function sendMsg(sender, receiver, mensaje) {
    const msg = { de: sender, mensaje: mensaje };
    fs.appendFileSync(path.join(TEAM_DIR, `mailbox/${receiver}.msg`), JSON.stringify(msg) + "\n");
    console.log(`✓ Mensaje enviado a ${receiver}.`);
}

// Lógica para leer los comandos desde la terminal
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log("Uso: node team_manager.js [init|assign|broadcast|msg] ...");
    process.exit(1);
}

const cmd = args[0];

if (cmd === "init") {
    initTeam();
} else if (cmd === "assign" && args.length >= 3) {
    const deps = args.length > 3 ? args[3] : "";
    assignTask(args[1], args[2], deps);
} else if (cmd === "broadcast" && args.length === 2) {
    broadcast(args[1]);
} else if (cmd === "msg" && args.length === 4) {
    sendMsg(args[1], args[2], args[3]);
} else {
    console.log("Comandos o argumentos inválidos.");
}

