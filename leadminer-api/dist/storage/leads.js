"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inserirLead = inserirLead;
exports.adicionarLeads = adicionarLeads;
exports.listarLeads = listarLeads;
const leadsPorUrl = new Map();
function inserirLead(lead) {
    if (!leadsPorUrl.has(lead.urlMaps)) {
        leadsPorUrl.set(lead.urlMaps, lead);
    }
}
function adicionarLeads(novosLeads) {
    for (const lead of novosLeads) {
        inserirLead(lead);
    }
}
function listarLeads() {
    return Array.from(leadsPorUrl.values()).reverse();
}
//# sourceMappingURL=leads.js.map