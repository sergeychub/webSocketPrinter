escpos = require("escpos");
escpos.USB = require("escpos-usb");
devices = escpos.USB.findPrinter();
var bmp = require("bmp-js");
fs = require("fs");
Jimp = require("jimp");
jsQR = require("jsqr");
var EventLogger = require("node-windows").EventLogger;
var log = new EventLogger("AUTOF DEVICE MANAGER");

var thermalPrinterOptions = { encoding: "CP866" };
const USBThermalPrinter = devices.find(
  (dev) => dev.deviceDescriptor.idVendor === 1155
);
var legacyPrinter = USBThermalPrinter
  ? new escpos.USB(USBThermalPrinter)
  : undefined;
var thermalPrinter = legacyPrinter
  ? new escpos.Printer(legacyPrinter, thermalPrinterOptions)
  : undefined;

const USBLabelPrinter = devices.find(
  (dev) => dev.deviceDescriptor.idVendor === 8137
);

var legacyLabelPrinter = USBLabelPrinter
  ? new escpos.USB(USBLabelPrinter)
  : undefined;

var labelPrinter = legacyLabelPrinter
  ? new escpos.Printer(legacyLabelPrinter)
  : undefined;

const usbDetect = require("usb-detection");
const express = require("express");
const app = express();
const port = 3333;

usbDetect.startMonitoring();

usbDetect.on("add:8137", (device) => {
  const USBLabelPrinter = devices.find(
    (dev) => dev.deviceDescriptor.idVendor === 8137
  );

  legacyLabelPrinter = USBLabelPrinter
    ? new escpos.USB(USBLabelPrinter)
    : undefined;

  labelPrinter = legacyLabelPrinter
    ? new escpos.Printer(legacyLabelPrinter)
    : undefined;
  socket.emit("label_printer_add");
});
usbDetect.on("remove:8137", (device) => {
  legacyLabelPrinter = undefined;
  labelPrinter = undefined;
  socket.emit("label_printer_remove");
});

usbDetect.on("add:1155", (device) => {
  const USBPrinter = escpos.USB.findPrinter().find(
    (dev) => dev.deviceDescriptor.idVendor === 1155
  );
  legacyPrinter = new escpos.USB(USBPrinter);
  thermalPrinter = legacyPrinter
    ? new escpos.Printer(legacyPrinter, thermalPrinterOptions)
    : undefined;
  socket.emit("thermal_printer_add");
});

usbDetect.on("remove:1155", (device) => {
  legacyPrinter = undefined;
  thermalPrinter = undefined;
  socket.emit("thermal_printer_remove");
});

async function index(imageBuffer) {
  return new Promise(async (resolve, reject) => {
    await Jimp.read(await imageBuffer, (err, image) => {
      if (err) reject(err);
      resolve(new Uint8ClampedArray(image.bitmap.data.buffer));
    });
  });
}

function testPrint() {
  legacyLabelPrinter.open((err) => {
    legacyLabelPrinter.write(
      new Uint8Array([
        0x53, 0x49, 0x5a, 0x45, 0x20, 0x34, 0x2c, 0x32, 0x0d, 0x0a, 0x47, 0x41,
        0x50, 0x20, 0x30, 0x2c, 0x30, 0x0d, 0x0a, 0x43, 0x4c, 0x53, 0x0d, 0x0a,
        0x42, 0x49, 0x54, 0x4d, 0x41, 0x50, 0x20, 0x32, 0x30, 0x30, 0x2c, 0x32,
        0x30, 0x30, 0x2c, 0x32, 0x2c, 0x31, 0x36, 0x2c, 0x30, 0x2c, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x07, 0xff, 0x03, 0xff, 0x11, 0xff, 0x18, 0xff,
        0x1c, 0x7f, 0x1e, 0x3f, 0x1f, 0x1f, 0x1f, 0x8f, 0x1f, 0xc7, 0x1f, 0xe3,
        0x1f, 0xe7, 0x1f, 0xff, 0x1f, 0xff, 0x0d, 0x0a, 0x50, 0x52, 0x49, 0x4e,
        0x54, 0x20, 0x31, 0x2c, 0x31, 0x0d, 0x0a,
      ])
    );
  });
}

function printLabel(barcode, quanInPackage = 1, quanPrint = 1) {
  legacyLabelPrinter.open((err) => {
    legacyLabelPrinter.write(`
    GAPDETECT
    SPEED 1
    DENSITY 8
    DIRECTION 0
    CLS
    BITMAP 0,0,28,130,1,${barcode.toString()}
    PRINT ${quanPrint}`);
    // legacyLabelPrinter.write();
    // legacyLabelPrinter.write(`PRINT ${quanPrint}`);
  });
}

// QRCODE 55,25,M,5,M,0,M2,S2,"${barcode}*${quanInPackage}"

// BARCODE 5,80,"${barcodeType}",50,1,0,${barcodeWidth},1,"${barcode}"

function printExportDoc(image, products, doc) {
  let date = new Date(doc.date_created);
  date = `${date.getDate()}.${
    date.getMonth() + 1
  }.${date.getFullYear()} ${date.toLocaleTimeString()}`;
  legacyPrinter.open(function (error) {
    legacyPrinter.write(new Uint8Array([0x1f, 0x1b, 0x1f, 0xfe, 0x01]));
    legacyPrinter.write(new Uint8Array([0x1b, 0x74, 17]));
    legacyPrinter.write(new Uint8Array([0x1b, 0x7b, 0])); //Направление печати
    //IMAGE
    thermalPrinter.align("ct").image(image, "D24");

    //TEXT
    thermalPrinter
      .size(0.01, 0.01)
      .marginRight(0)
      .style("NORMAL")
      .text("АВТОФОРВАРД")
      .text("Магазин автозапчастин")
      .text("ФОП ЧУБ О.В.")
      .text("IД 2843414164\n")
      .barcode(String(200000000000 + doc.id), "EAN13", 3, 30, "BLW", "A")
      .text(`${date}\n`)
      .text(`Товарний чек №${doc.id}\n`);
    let sum = 0;
    products.forEach((row) => {
      sum += row.quan * row.price;
      thermalPrinter
        .align("LT")
        .text(row.description)
        .table([row.brand, `ID №${row.id}`])
        .table([
          `${row.quan} x ${row.price} грн`,
          `${Math.round(row.quan * row.price * 100) / 100} грн`,
        ]);
    });

    thermalPrinter.tableCustom([
      { text: "Сума", style: "B" },
      { text: `${Math.round(sum * 100) / 100} грн`, style: "B" },
    ]);
    if (doc.fiscalCode) {
      thermalPrinter
        .text(`фiск. номер чека: ${doc.fiscalCode}`)
        .align("ct")
        .qrimage(
          doc.fiscalQR,
          { type: "png", mode: "dhdw", size: 3 },
          function (err) {
            this.cut();
            this.close();
          }
        );
    } else {
      thermalPrinter
        .align("ct")
        .qrimage(
          `http://new.api.autof.com.ua/doc/export/check/${doc.id}`,
          { type: "png", mode: "dhdw", size: 3 },
          function (err) {
            this.cut();
            this.close();
          }
        );
    }
  });
}

function printAssemblySheet(warehouse, products) {
  let date = new Date();
  date = `${date.getDate()}.${
    date.getMonth() + 1
  }.${date.getFullYear()} ${date.toLocaleTimeString()}`;
  legacyPrinter.open(function (error) {
    legacyPrinter.write(new Uint8Array([0x1f, 0x1b, 0x1f, 0xfe, 0x01]));
    legacyPrinter.write(new Uint8Array([0x1b, 0x74, 17]));
    legacyPrinter.write(new Uint8Array([0x1b, 0x7b, 0])); //Направление печати

    //TEXT
    thermalPrinter
      .size(0.01, 0.01)
      .marginRight(0)
      .style("NORMAL")
      .text(`${date}\n`)
      .text(`Сборочный лист\n`);
    let sum = 0;
    products.forEach((row) => {
      sum += row.quan * row.price;
      thermalPrinter
        .align("LT")
        .text(row.description)
        .table([row.brand])
        .table([row.article])
        .table([`${row.quan} из ${row.nal}`, row.cell || ""]);
    });
    thermalPrinter.cut().close();
  });
}

function generateEAN13(id) {
  let newBarcode = String(482000000000 + id);
  let controlSumEven = 0;
  let controlSumOdd = 0;

  Array.from(String(newBarcode), (num, index) => {
    if (Number(index + 1) % 2) {
      controlSumEven += Number(num);
    } else {
      controlSumOdd += Number(num);
    }
  });
  controlSumOdd = controlSumOdd * 3;
  let constrolSum =
    Math.ceil((controlSumEven + controlSumOdd) / 10) * 10 -
    (controlSumEven + controlSumOdd);

  return String(newBarcode).concat(String(constrolSum));
}

app.get("/", async (req, res) => {
  res.send("Hello from service");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// const device2 = new escpos.USB(
//   devices.find(
//     (dev) =>
//       dev.deviceDescriptor.idVendor === 8137 &&
//       dev.deviceDescriptor.idProduct === 8214
//   )
// );
// const device = new escpos.USB(
//   devices.find(
//     (dev) =>
//       dev.deviceDescriptor.idVendor === 1155 &&
//       dev.deviceDescriptor.idProduct === 1803
//   )
// );
// const options = { encoding: "CP866" };
// const printer = new escpos.Printer(device, options);
// const printer2 = new escpos.Printer(device2, options);

// function print3(name, brand, article, barcode) {
//   var iconv = new Iconv('UTF-8', 'CP866');
//   device2.open(() => {
//     device2.write(new Uint8Array([0x1f, 0x1b, 0x1f, 0xfe, 0x01]));
//     device2.write(new Uint8Array([0x1b, 0x74, 17])); // Установка кодировки
//     device2.write(new Uint8Array([0x1b, 0x21, 1])); // Установка шрифта
//     device2.write(new Uint8Array([0x1b, 0x7b, 1])); //Направление печати
//     device2.write(new Uint8Array([0x1b, 0x61, 0.48])); //margin
//     // device2.write(new Uint8Array([0x1d, 0x4c, 0,0])); //Отступ слева
//     // device2.write(new Uint8Array([0x1b, 0x4c])); // PAGE MODE
//     // device2.write(new Uint8Array([0x1b, 0x53])); // Standart mode
//     // device2.write(new Uint8Array([0x1b, 0x54, 3.51])); // DIRECTION
//     // device2.write(new Uint8Array([0x1d, 0x57, 104, 1])); // PAGE MODE
//     // device2.write(new Uint8Array([0x1d, 0x50, 100, 200])); // PAGE MODE
//     // device2.write(new Uint8Array([0x1b, 0x0c])); // PRINT IN PAGE MODE
//     // device2.write(new Uint8Array([0x1b, 0x57, 0, 0])); // PAGE MODE SET SIZE
//     device2.write(iconv.convert(article))
//     device2.write(new Uint8Array([0x0a])); //перенос строки
//     device2.write(iconv.convert(brand))
//     device2.write(new Uint8Array([0x0a])); //перенос строки
//     device2.write(iconv.convert(name))
//     device2.write(new Uint8Array([0x0a])); //перенос строки
//     device2.write(new Uint8Array([0x1d, 0x6b, 6,])); //перенос строки
//     device2.write(new Uint8Array([0x0a])); //перенос строки
//     device2.write(new Uint8Array([0x0a])); //перенос строки
//     device2.write(new Uint8Array([0x0a])); //перенос строки

//     // device2.write(new Uint8Array([0x0d]));

//   })
// }
