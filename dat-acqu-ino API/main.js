// não altere!
const serialport = require('serialport');
const express = require('express');
const mysql = require('mysql2');
const sql = require('mssql');

// não altere!
const SERIAL_BAUD_RATE = 9600;
const SERVIDOR_PORTA = 3300;

// configure a linha abaixo caso queira que os dados capturados sejam inseridos no banco de dados.
// false -> nao insere
// true -> insere
const HABILITAR_OPERACAO_INSERIR = true;

// altere o valor da variável AMBIENTE para o valor desejado:
// API conectada ao banco de dados remoto, SQL Server -> 'producao'
// API conectada ao banco de dados local, MySQL Workbench - 'desenvolvimento'
const AMBIENTE = 'desenvolvimento';

const serial = async (
    valoresTempInterna,
    valoresTempExterna,
    valoresTempInterna1,
    valoresTempExterna1,
    valoresTempInterna2,
    valoresTempExterna2,
    valoresTempInterna3,
    valoresTempExterna3,
    valoresTempInterna4,
    valoresTempExterna4
) => {
    let poolBancoDados = ''

    if (AMBIENTE == 'desenvolvimento') {
        poolBancoDados = mysql.createPool(
            {
                // altere!
                // CREDENCIAIS DO BANCO LOCAL - MYSQL WORKBENCH (credenciais da julia)
                host: '10.18.32.56',
                user: 'ino',
                password: 'Arduino123',
                database: 'apicolatech'
            }
        ).promise();
    } else if (AMBIENTE == 'producao') {
        console.log('Projeto rodando inserindo dados em nuvem. Configure as credenciais abaixo.');
    } else {
        throw new Error('Ambiente não configurado. Verifique o arquivo "main.js" e tente novamente.');
    }


    const portas = await serialport.SerialPort.list();
    const portaArduino = portas.find((porta) => porta.vendorId == 2341 && porta.productId == 43);
    if (!portaArduino) {
        throw new Error('O arduino não foi encontrado em nenhuma porta serial');
    }
    const arduino = new serialport.SerialPort(
        {
            path: portaArduino.path,
            baudRate: SERIAL_BAUD_RATE
        }
    );
    arduino.on('open', () => {
        console.log(`A leitura do arduino foi iniciada na porta ${portaArduino.path} utilizando Baud Rate de ${SERIAL_BAUD_RATE}`);
    });
    arduino.pipe(new serialport.ReadlineParser({ delimiter: '\r\n' })).on('data', async (data) => {
        //console.log(data);
        const valores = data.split(';');
        const temperaturaInterna = parseFloat(valores[0]);
        const temperaturaExterna = parseFloat(valores[1]);
        const temperaturaInterna1 = parseFloat(valores[2]);
        const temperaturaExterna1 = parseFloat(valores[3]);
        const temperaturaInterna2 = parseFloat(valores[4]);
        const temperaturaExterna2 = parseFloat(valores[5]);
        const temperaturaInterna3 = parseFloat(valores[6]);
        const temperaturaExterna3 = parseFloat(valores[7]);
        const temperaturaInterna4 = parseFloat(valores[8]);
        const temperaturaExterna4 = parseFloat(valores[9]);
        
        valoresTempInterna.push(temperaturaInterna);
        valoresTempExterna.push(temperaturaExterna);
        valoresTempInterna1.push(temperaturaInterna1);
        valoresTempExterna1.push(temperaturaExterna1);
        valoresTempInterna2.push(temperaturaInterna2);
        valoresTempExterna2.push(temperaturaExterna2);
        valoresTempInterna3.push(temperaturaInterna3);
        valoresTempExterna3.push(temperaturaExterna3);
        valoresTempInterna4.push(temperaturaInterna4);
        valoresTempExterna4.push(temperaturaExterna4);

        if (HABILITAR_OPERACAO_INSERIR) {
            if (AMBIENTE == 'producao') {
                // altere!
                // Este insert irá inserir os dados na tabela "medida"
                // -> altere nome da tabela e colunas se necessário
                // Este insert irá inserir dados de fk_aquario id=1 (fixo no comando do insert abaixo)
                // >> Importante! você deve ter o aquario de id 1 cadastrado.
                sqlquery = `INSERT INTO medida (dht11_umidade, dht11_temperatura, luminosidade, lm35_temperatura, chave, momento, fk_aquario) VALUES (${dht11Umidade}, ${dht11Temperatura}, ${luminosidade}, ${lm35Temperatura}, ${chave}, CURRENT_TIMESTAMP, 1)`;

                // CREDENCIAIS DO BANCO REMOTO - SQL SERVER
                // Importante! você deve ter criado o usuário abaixo com os comandos presentes no arquivo
                // "script-criacao-usuario-sqlserver.sql", presente neste diretório.
                const connStr = "Server=servidor-acquatec.database.windows.net;Database=bd-acquatec;User Id=usuarioParaAPIArduino_datawriter;Password=#Gf_senhaParaAPI;";

                function inserirComando(conn, sqlquery) {
                    conn.query(sqlquery);
                    console.log("valores inseridos no banco: ", dht11Umidade + ", " + dht11Temperatura + ", " + luminosidade + ", " + lm35Temperatura + ", " + chave)
                }

                sql.connect(connStr)
                    .then(conn => inserirComando(conn, sqlquery))
                    .catch(err => console.log("erro! " + err));

            } else if (AMBIENTE == 'desenvolvimento') {

                // altere!
                // Este insert irá inserir os dados na tabela "medida"
                // -> altere nome da tabela e colunas se necessário
                // Este insert irá inserir dados de fk_aquario id=1 (fixo no comando do insert abaixo)
                // >> você deve ter o aquario de id 1 cadastrado.
                await poolBancoDados.execute(
                    // 'INSERT INTO medida (dht11_umidade, dht11_temperatura, luminosidade, lm35_temperatura, chave, momento, fk_aquario) VALUES (?, ?, ?, ?, ?, now(), 1)',
                    // [dht11Umidade, dht11Temperatura, luminosidade, lm35Temperatura, chave]
                    `INSERT INTO RegistroApiario (DataHora, Temperatura, fkSensor) VALUES (now(), ?, 1)`,
                    [temperaturaInterna1]
                );

                await poolBancoDados.execute(
                    `INSERT INTO RegistroApiario (DataHora, Temperatura, fkSensor) VALUES (now(), ?, 2)`,
                    [temperaturaExterna1]
                );

                console.log("valores inseridos no banco: ", temperaturaInterna1 + ", " + temperaturaExterna1) //+ ", " + luminosidade + ", " + lm35Temperatura + ", " + chave)

            } else {
                throw new Error('Ambiente não configurado. Verifique o arquivo "main.js" e tente novamente.');
            }
        }
    });
    arduino.on('error', (mensagem) => {
        console.error(`Erro no arduino (Mensagem: ${mensagem}`)
    });
}


// não altere!
const servidor = (

        valoresTempInterna,
        valoresTempExterna,
        valoresTempInterna1,
        valoresTempExterna1,
        valoresTempInterna2,
        valoresTempExterna2,
        valoresTempInterna3,
        valoresTempExterna3,
        valoresTempInterna4,
        valoresTempExterna4
    
) => {
    const app = express();
    app.use((request, response, next) => {
        response.header('Access-Control-Allow-Origin', '*');
        response.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
        next();
    });
    app.listen(SERVIDOR_PORTA, () => {
        console.log(`API executada com sucesso na porta ${SERVIDOR_PORTA}`);
    });
    app.get('/sensores/lm35/temperaturaI', (_, response) => {
        return response.json(valoresTempInterna);
    });
    app.get('/sensores/lm35/temperaturaE', (_, response) => {
        return response.json(valoresTempExterna);
    });
    app.get('/sensores/lm35/temperaturaI1', (_, response) => {
        return response.json(valoresTempInterna1);
    });
    app.get('/sensores/lm35/temperaturaE1', (_, response) => {
        return response.json(valoresTempExterna1);
    });
    app.get('/sensores/lm35/temperaturaI2', (_, response) => {
        return response.json(valoresTempInterna2);
    });
    app.get('/sensores/lm35/temperaturaE2', (_, response) => {
        return response.json(valoresTempExterna2);
    });
    app.get('/sensores/lm35/temperaturaI3', (_, response) => {
        return response.json(valoresTempInterna3);
    });
    app.get('/sensores/lm35/temperaturaE3', (_, response) => {
        return response.json(valoresTempExterna3);
    });
    app.get('/sensores/lm35/temperaturaI4', (_, response) => {
        return response.json(valoresTempInterna4);
    });
    app.get('/sensores/lm35/temperaturaE4', (_, response) => {
        return response.json(valoresTempExterna4);
    });
}

(async () => {
    const valoresTempInterna = [];
    const valoresTempExterna = [];
    const valoresTempInterna1 = [];
    const valoresTempExterna1 = [];
    const valoresTempInterna2 = [];
    const valoresTempExterna2 = [];
    const valoresTempInterna3 = [];
    const valoresTempExterna3 = [];
    const valoresTempInterna4 = [];
    const valoresTempExterna4 = [];

    await serial(
     valoresTempInterna,
     valoresTempExterna,
     valoresTempInterna1,
     valoresTempExterna1,
     valoresTempInterna2,
     valoresTempExterna2,
     valoresTempInterna3,
     valoresTempExterna3,
     valoresTempInterna4,
     valoresTempExterna4

    
    );
    servidor(
        valoresTempInterna,
        valoresTempExterna,
        valoresTempInterna1,
        valoresTempExterna1,
        valoresTempInterna2,
        valoresTempExterna2,
        valoresTempInterna3,
        valoresTempExterna3,
        valoresTempInterna4,
        valoresTempExterna4
       
    );
})();
