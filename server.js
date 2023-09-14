
const WebSocket = require('ws');
const fs = require('fs');

const MATRIX_FILE_PATH = './matrix.txt';

// Создаем WebSocket-сервер на порту 8080
const wss = new WebSocket.Server({ port: 8001 });


// Функция для чтения текущего состояния матрицы из файла
function readMatrixFromFile() {
    try {
        if (fs.existsSync(MATRIX_FILE_PATH)) {
            const data = fs.readFileSync(MATRIX_FILE_PATH, 'utf8').trim();
            if (data === '') {
                return [];
            }

            // Разделение данных на отдельные объекты JSON
            const jsonObjects = data.match(/\{.*?\}/g);

            // Обработка каждого отдельного объекта JSON
            const matrix = jsonObjects.map((jsonObj, index) => {
                // Добавляем пропущенную закрывающую скобку (}) для всех объектов, кроме первого и последнего
                //if (index > 0 && index < jsonObjects.length - 1) {
                //    jsonObj = jsonObj + '}';
                //}

                try {
					//console.log('То, что мы отправляем клиентам JSON.parse(jsonObj):',JSON.parse(jsonObj));
                    return JSON.parse(jsonObj);
                } catch (err) {
                    console.error(`Ошибка при парсинге объекта JSON #${index + 1}:`, err);
                    return null;
                }
            });

            // Фильтрация невалидных объектов JSON
            const validMatrix = matrix.filter(obj => obj !== null);

            return validMatrix;
        } else {
            return [];
        }
    } catch (err) {
        console.error('Ошибка при чтении файла матрицы:', err);
        return [];
    }
}

// Функция для записи текущего состояния матрицы в файл
function writeMatrixToFile(matrix) {
    // Чтение существующей матрицы из файла
    const existingMatrix = readMatrixFromFile();

    // Проверка наличия повторяющегося squareId
    let duplicateIndex = -1;
    for (let i = 0; i < existingMatrix.length; i++) {
        if (existingMatrix[i].squareId === matrix.squareId) {
            duplicateIndex = i;
            break;
        }
	}
    

    // Если найден повторяющийся squareId, удалить соответствующую строку
    if (duplicateIndex !== -1) {
        existingMatrix.splice(duplicateIndex, 1);
		//console.log('existingMatrix ', existingMatrix);
    }
	

    // Запись обновленной матрицы в файл
    try {
        const data = JSON.stringify(matrix);
		//console.log('data ', data);
		fs.writeFileSync(MATRIX_FILE_PATH, JSON.stringify(existingMatrix), { encoding: "utf-8", flag: "w" });
        fs.writeFileSync(MATRIX_FILE_PATH, data, { encoding: "utf-8", flag: "a" });
    } catch (err) {
        console.error('Ошибка при записи файла матрицы:', err);
    }
}


// Обработчик события подключения нового клиента
wss.on('connection', function connection(ws) {
    console.log('Новое соединение установлено.');
	let matrix = readMatrixFromFile();
	//console.log('matrix из файла:',matrix)
	
	 // При подключении отправляем текущее состояние матрицы клиенту
            
		wss.clients.forEach(function each(client) {
            if (client == ws && client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(readMatrixFromFile()));
			//console.log('То, что мы отправляем клиентам вначале:',readMatrixFromFile())
            }
        });
        
	

    // Обработчик события получения сообщения от клиента
    ws.on('message', function incoming(message) {
		var data = JSON.parse(message);
		var squareId = data.squareId;
        var color = data.color;
		 // Обновляем состояние матрицы
       Object.keys(matrix).forEach(row => {
            Object.keys(row).forEach(square => {
                if (square.squareId === squareId) {
                    square.color = color;
                }
            });
        });

        // Записываем обновленное состояние матрицы в файл
        writeMatrixToFile(JSON.parse(message));
		//console.log('То, что мы записываем в файл: ',JSON.parse(message));

        // Рассылаем сообщение всем подключенным клиентам, кроме отправителя
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
				console.log('То, что мы отправляем клиентам:',JSON.stringify(data))
            }
        });
    });

    // Обработчик события закрытия соединения клиента
    ws.on('close', function close() {
        console.log('Соединение закрыто.');
    });
});

console.log('WebSocket-сервер запущен на порту 8001.');