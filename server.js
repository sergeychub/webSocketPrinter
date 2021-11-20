const WebSocket = require('ws');
const Iconv = require('iconv').Iconv;
const wsServer = new WebSocket.Server({port: 9000});
const escpos = require('escpos');
escpos.USB = require('escpos-usb');
const devices = escpos.USB.findPrinter()
const device2  = new escpos.USB(devices.find(dev => dev.deviceDescriptor.idVendor === 8137 && dev.deviceDescriptor.idProduct === 8214));
const device  = new escpos.USB(devices.find(dev => dev.deviceDescriptor.idVendor === 1155 && dev.deviceDescriptor.idProduct === 1803));
const options = { encoding: "CP866"}
const printer = new escpos.Printer(device, options);
const printer2 = new escpos.Printer(device2, options);

function printLabel(brand, article, barcode, quan, barcodeType = "EAN128"){

  let barcodeWidth = 2;

  if(barcodeType == "EAN128"){
    barcodeWidth = 1;
  }

  device2.open(err => {
    device2.write(`
    GAPDETECT
    SPEED 1
    DENSITY 8
    DIRECTION 1
    CLS
    TEXT 5,15,"2",0,1,1,"${brand}"
    TEXT 5,40,"2",0,1,1,"${article}"
    BARCODE 5,80,"${barcodeType}",50,1,0,${barcodeWidth},1,"${barcode}"
    PRINT ${quan} 
    `);
  })
}

function print3(name, brand, article, barcode) {
  var iconv = new Iconv('UTF-8', 'CP866');
  device2.open(() => {
    device2.write(new Uint8Array([0x1f, 0x1b, 0x1f, 0xfe, 0x01]));
    device2.write(new Uint8Array([0x1b, 0x74, 17])); // Установка кодировки
    device2.write(new Uint8Array([0x1b, 0x21, 1])); // Установка шрифта
    device2.write(new Uint8Array([0x1b, 0x7b, 1])); //Направление печати
    device2.write(new Uint8Array([0x1b, 0x61, 0.48])); //margin
    // device2.write(new Uint8Array([0x1d, 0x4c, 0,0])); //Отступ слева
    // device2.write(new Uint8Array([0x1b, 0x4c])); // PAGE MODE
    // device2.write(new Uint8Array([0x1b, 0x53])); // Standart mode
    // device2.write(new Uint8Array([0x1b, 0x54, 3.51])); // DIRECTION
    // device2.write(new Uint8Array([0x1d, 0x57, 104, 1])); // PAGE MODE
    // device2.write(new Uint8Array([0x1d, 0x50, 100, 200])); // PAGE MODE
    // device2.write(new Uint8Array([0x1b, 0x0c])); // PRINT IN PAGE MODE
    // device2.write(new Uint8Array([0x1b, 0x57, 0, 0])); // PAGE MODE SET SIZE
    device2.write(iconv.convert(article))
    device2.write(new Uint8Array([0x0a])); //перенос строки
    device2.write(iconv.convert(brand))
    device2.write(new Uint8Array([0x0a])); //перенос строки
    device2.write(iconv.convert(name))
    device2.write(new Uint8Array([0x0a])); //перенос строки
    device2.write(new Uint8Array([0x1d, 0x6b, 6,])); //перенос строки
    device2.write(new Uint8Array([0x0a])); //перенос строки
    device2.write(new Uint8Array([0x0a])); //перенос строки
    device2.write(new Uint8Array([0x0a])); //перенос строки
    
    
    // device2.write(new Uint8Array([0x0d]));
    
  })
}

// print3("Фильтр масляный", "MAHLE ORIGINAL", "OC90OF", generateEAN13(2))

// printLabel("MAHLE ORIGINAL", "OC90OF", generateEAN13(2), 1, "EAN13")

function print4(name, brand, article, barcode){
  device2.open(err => {
    device2.write(new Uint8Array([0x1f, 0x1b, 0x1f, 0xfe, 0x01]));
    device2.write(new Uint8Array([0x1b, 0x74, 17]));
    device2.write(new Uint8Array([0x1b, 0x7b, 1])); //Направление печати
    device2.write(new Uint8Array([0x1b, 0x61, 0.48])); //margin
    printer2
    .size(0.01, 0.01)
    .barcode('488888888888',"EAN13", 1, 50)
    .text(article)
    .text(brand)
    .text(name)
    .cut()
    .close()
  })
}

// print4("Фильтр масляный", "MAHLE ORGIGINAL", "OC90OF", "4009026000038");
// printLabel("MAHLE", "OC90", "4820000000020", 1);


function generateEAN13(id){

  let newBarcode = String(482000000000 + id);
  let controlSumEven = 0;
  let controlSumOdd = 0;

  Array.from(String(newBarcode), (num, index) => {
    if(Number(index + 1) % 2) {
      controlSumEven += Number(num)
    } else {
      controlSumOdd += Number(num)
    }
  })
  controlSumOdd = controlSumOdd * 3;
  let constrolSum = (Math.ceil((controlSumEven + controlSumOdd) / 10) * 10) - (controlSumEven + controlSumOdd);

  return String(newBarcode).concat(String(constrolSum))
}

function print(image, products, doc) {
    let date = new Date(doc.date);
    date = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()} ${date.toLocaleTimeString()}`
    device.open(function(error){
        device.write(new Uint8Array([0x1f, 0x1b, 0x1f, 0xfe, 0x01]));
        device.write(new Uint8Array([0x1b, 0x74, 17]));
        device.write(new Uint8Array([0x1b, 0x7b, 0])); //Направление печати
        //IMAGE
        printer.align('ct').image(image, 'D24')

        //TEXT
        printer
          .size(0.01, 0.01)
          .marginRight(0)
          .style("NORMAL")
          .text("АВТОФОРВАРД")
          .text("Магазин автозапчастин")
          .text("ФОП ЧУБ О.В.")
          .text("IПН 2843414164\n")
          // .barcode('0000054', 'EAN8', 4, 50)
          .text(`${date}\n`)
          .text(`Товарний чек №${doc.id}\n`)
          
        let sum = 0;
        products.forEach(row => {
          sum += row.quan * row.price;
          printer
          .align("LT")
          .text(row.description)
          .table([row.brand, `ID №${row.id}`])
          .table([`${row.quan} x ${row.price} грн`, `${Math.round(row.quan * row.price * 100) / 100} грн`])
        })
        
        printer
        .tableCustom([
          {text: "Сумма", style: "B"},
          {text: `${Math.round(sum * 100) / 100} грн`, style: "B"}
        ])
        .cut()
        .close()

        // printer
        // .qrimage('http://new.api.autof.com.ua/doc/export/check/59', function(err){
        //   this.cut();
        //   this.close();
        // })
         
      });
}

function printCheck(products, doc){
  escpos.Image.load("C:/Users/Serge/projects/webSocketPrinter/logo2.png", image => {
    if(image) print(image, products, doc);
  })
}


function handleMessage(message){
    const data = JSON.parse(message);
    switch(data.action){
        case "PRINT":
            printCheck(data.data.products, {id: data.data.id , date: data.data.date_created})
        break;

        case "PRINT_LABEL":
            printLabel(data.data.barcode, Number(data.data.quan))
        break;

        default:
            return 
    }
}


function onConnect(wsClient) {
    console.log("Пользователь подключился!")
    wsClient.on('message', handleMessage)
    wsClient.on('close', function() {
      console.log('Пользователь отключился');
    })
  }

wsServer.on('connection', onConnect);