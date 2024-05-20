const fs = require('fs');
const yargs = require('yargs/yargs');
const papaparse = require('papaparse');

const argv = yargs(require('yargs/helpers').hideBin(process.argv))
  .options
    ({
    input:
      {
      alias: "i",
      type: "string",
      requiresArg: true,
      demandOption: true
      },
    output:
      {
      alias: "o",
      type: "string",
      requiresArg: true,
      demandOption: true
      },
    from:
      {
      alias: ["offset", "f", "s"],
      type: "number",
      requiresArg: true
      },
    to:
      {
      alias: "t",
      type: "number",
      requiresArg: true
      },
    limit:
      {
      alias: "l",
      type: "number",
      requiresArg: true
      }
    })
  .argv;

function generatePrompt (strAnonymizedDialog)
  {
  let strPrompt =
    "Here is a dialog between a bank support and its client. "+
    "In this dialog the names of persons, companies, telephon numbers, dates and times, etc were removed and replaced by \"#\" and \"*\" placeholders. "+
    "Fill all the placeholders with imagined data:\r\n"+
    strAnonymizedDialog;
  return (strPrompt);
  }

let strInputRows;
try
  {
  strInputRows = fs.readFileSync(argv.input, 'utf8');
  }
catch (e)
  {
  process.stderr.write ("Error! Can't read the input file: "+ argv.input +"\n");
  process.exit ();
  }

let objRows = papaparse.parse (strInputRows, {header: true, delimiter: "\t", quoteChar: ""});
let arRows = objRows.data;

arRows = arRows.slice (argv.from, argv.to);
arRows.length = Math.min ((argv.limit ?? arRows.length), arRows.length);

for (let objRow of arRows)
  {
  objRow.prompt = generatePrompt (objRow.anonymized);
  }

let strResult = JSON.stringify(arRows, null, "  ");;
try
  {
  fs.writeFileSync(argv.output, strResult);
  }
catch (e)
  {
  process.stderr.write ("Error! Can't create the output file: "+ argv.output +"\n");
  process.exit ();
  }