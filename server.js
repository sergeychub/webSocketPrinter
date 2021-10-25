const WebSocket = require('ws');
const wsServer = new WebSocket.Server({port: 9000});
const escpos = require('escpos');
escpos.USB = require('escpos-usb');
const devices = escpos.USB.findPrinter()
const device2  = new escpos.USB(devices.find(dev => dev.deviceDescriptor.idVendor === 8137 && dev.deviceDescriptor.idProduct === 8214));
const device  = new escpos.USB(devices.find(dev => dev.deviceDescriptor.idVendor === 1155 && dev.deviceDescriptor.idProduct === 1803));
const options = { encoding: "CP866"}
const printer = new escpos.Printer(device, options);

function printLabel(barcode, quan){
  device2.open(err => {
    device2.write(`
    GAPDETECT
    SPEED 4
    DENSITY 8
    DIRECTION 0
    CLS
    BARCODE 12,50,"128",50,1,0,1,1,"${barcode}"
    PRINT ${quan} 
    `);
  })
}

function print(image, products, doc) {
    let date = new Date(doc.date);
    date = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()} ${date.toLocaleTimeString()}`
    device.open(function(error){
        device.write(new Uint8Array([0x1f, 0x1b, 0x1f, 0xfe, 0x01]));
        device.write(new Uint8Array([0x1b, 0x74, 17]));

        //IMAGE
        printer.align('ct').image(image, 'D24')

        //TEXT
        printer
          .size(0.01, 0.01)
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
  escpos.Image.load("./logo2.png", image => {
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