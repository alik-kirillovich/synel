const fs = require('fs');
const yargs = require('yargs/yargs');

const argv = yargs(require('yargs/helpers').hideBin(process.argv))
  .options
    ({
    input:
      {
      alias: "i",
      type: "string",
      array: true,
      requiresArg: true,
      demandOption: true,
      }
    })
  .argv;
  
const hshTagType2EntitiesListName =
  {
  "c": "companies",
  "i": "industries",
  "l": "locations"
  }

function round (num) {return Math.round (num * 1000) / 1000};

function capitalize (str) {return str.charAt(0).toUpperCase() + str.slice(1)};

function computeF1 ({intTruePositive, intFalsePositive, intFalseNegative})
  {
  let numRecall = intTruePositive / (intTruePositive + intFalseNegative);
  let numPrecision = intTruePositive / (intTruePositive + intFalsePositive);
  let numF1 = 2 * (numRecall * numPrecision) / (numRecall + numPrecision);
  return ({numRecall, numPrecision, numF1});
  }
  
function printF1 ({intTruePositive, intFalsePositive, intFalseNegative, numRecall, numPrecision, numF1})
  {
  console.log ("True positive: "+ intTruePositive);
  console.log ("False positive: "+ intFalsePositive);
  console.log ("False negative: "+ intFalseNegative);
  console.log ("Recall: "+ round (numRecall));
  console.log ("Precision: "+ round (numPrecision));
  console.log ("F1: "+ round (numF1));
  }

let strMarkup = "";
let arPaths = argv.input;
for (let strPath of arPaths)
  {
  strMarkup += fs.readFileSync(strPath, "utf-8") +"\r\n\r\n";
  }

let intAllTruePositive = 0;
let intAllFalsePositive = 0;
let intAllFalseNegative = 0;

for ([strTagType, strEntitiesListName] of Object.entries (hshTagType2EntitiesListName))
  {
  let reTruePositive = new RegExp ("\\<"+ strTagType +"\\d+\\>", "g");
  let reFalsePositive = new RegExp ("\\<"+ strTagType +"\\d+\\s+E", "g");
  let reFalseNegative = new RegExp ("\\<"+ strTagType.toUpperCase () +"\\d*(\\s|\\>)", "g");
  
  let intTruePositive = strMarkup.match (reTruePositive)?.length ?? 0;
  let intFalsePositive = strMarkup.match (reFalsePositive)?.length ?? 0;
  let intFalseNegative = strMarkup.match (reFalseNegative)?.length ?? 0;
  
  intAllTruePositive += intTruePositive;
  intAllFalsePositive += intFalsePositive;
  intAllFalseNegative += intFalseNegative;
  
  let {numRecall, numPrecision, numF1} = computeF1 (
    {
    intTruePositive,
    intFalsePositive,
    intFalseNegative
    });
  
  let strEntityType = capitalize (strEntitiesListName);
  
  console.log (strEntityType +": ");
  console.log ("True positive: "+ intTruePositive);
  console.log ("False positive: "+ intFalsePositive);
  console.log ("False negative: "+ intFalseNegative);
  console.log ("Recall: "+ round (numRecall));
  console.log ("Precision: "+ round (numPrecision));
  console.log ("F1: "+ round (numF1));
  console.log ("");
  }
  
let {numRecall: numAllRecall, numPrecision: numAllPrecision, numF1: numAllF1} = computeF1 (
  {
  intTruePositive:  intAllTruePositive,
  intFalsePositive: intAllFalsePositive,
  intFalseNegative: intAllFalseNegative
  });
  
console.log ("All:");
console.log ("True positive: "+ intAllTruePositive);
console.log ("False positive: "+ intAllFalsePositive);
console.log ("False negative: "+ intAllFalseNegative);
console.log ("Recall: "+ round (numAllRecall));
console.log ("Precision: "+ round (numAllPrecision));
console.log ("F1: "+ round (numAllF1));
  
