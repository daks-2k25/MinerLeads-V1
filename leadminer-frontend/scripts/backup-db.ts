import { realizarBackup } from "../src/storage/backup";

realizarBackup()
  .then((destino) => {
    console.log(`Backup criado com sucesso: ${destino}`);
  })
  .catch((erro) => {
    console.error("Falha ao criar backup:", erro);
    process.exitCode = 1;
  });
