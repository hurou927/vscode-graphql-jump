"use strict";
exports.__esModule = true;
var child_process_1 = require("child_process");
var util_1 = require("util");
var execAsync = (0, util_1.promisify)(child_process_1.exec);
console.log("hello");
// (async () => {
// const { stdout ,stderr} = await execAsync('rg buyerMonthly | head -n 1', { 
//             cwd: '~/git/goooods',
//             timeout: 3000 // 10秒でタイムアウト
//         })
//
// console.log(stdout, stderr)
//
// })()
// console.log("hello")
