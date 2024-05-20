const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const axios = require('axios');
const sleep = require('sleep-promise');

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
    promptField:
      {
      type: "string",
      requiresArg: true,
      default: "prompt"
      },
    dialogField:
      {
      type: "string",
      requiresArg: true,
      default: "dialog"
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
      },
    token:
      {
      type: "string",
      requiresArg: true,
      default: path.join(__dirname, "token.txt")
      },
    timeout:
      {
      type: "number",
      default: 60000
      },
    attempts:
      {
      type: "number",
      default: 3
      },
    })
  .argv;
  
async function gptRequest (strPrompt, strToken, {temperature, timeout})
  {
  let strGptAnswer;
  
  let objResponse = await axios.post
    (
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages:
          [
            {
            role: "user",
            content: strPrompt
            }
          ],
        ...(temperature == "auto" ? {} : {"temperature": temperature})
      },
      {
        headers:
          {
          'Content-Type': "application/json",
          'Authorization': "Bearer "+ strToken
          },
        timeout: timeout
      }
    );
    
  strGptAnswer = objResponse.data.choices[0].message.content;
  return (strGptAnswer);
  }

async function getGptAnswer
  (
    strPrompt,
    strToken,
    {
      temperature = "auto",
      timeout = 0,
      maxAttempts = 1,
      delay = (intAttemptNumber => 10000)
    }
  )
  {
  let strGptAnswer;
  
  let erError;
  for (let intAttemptNumber = 0; intAttemptNumber < maxAttempts; intAttemptNumber++)
    {
    try
      {
      strGptAnswer = await gptRequest (strPrompt, strToken, {temperature, timeout});
      if (intAttemptNumber > 0) process.stderr.write ("Attempt #"+ (intAttemptNumber+1) +" / "+ maxAttempts +" succeeded!\r\n");
      erError = null;
      break;
      }
    catch (e)
      {
      process.stderr.write ("Attempt #"+ (intAttemptNumber+1) +" / "+ maxAttempts +" failed! "+ e.name +": "+ e.message +"\r\n");
      erError = e;
      if (intAttemptNumber < maxAttempts-1)
        {
        await sleep (delay (intAttemptNumber));
        }
      }
    }
  
  if (erError)
    {
    throw (erError);
    }
  
  return (strGptAnswer);
  }
  
let strPrompts;
try
  {
  strPrompts = fs.readFileSync (argv.input, "utf8");
  }
catch (e)
  {
  process.stderr.write ("Error! Can't read the input file: "+ argv.input +"\n");
  process.exit ();
  }
let arPrompts = JSON.parse (strPrompts);

let strToken;
try
  {
  strToken = fs.readFileSync (argv.token, "utf-8");
  }
catch (e)
  {
  process.stderr.write ("Error! Can't read the file with a ChatGPT token: "+ argv.token +"\n");
  process.exit ();
  }

arPrompts = arPrompts.slice (argv.from, argv.to);
arPrompts.length = Math.min ((argv.limit ?? arPrompts.length), arPrompts.length);

let inErrorsCount = 0;

(async () =>
  {
  let startTime = new Date().getTime ();
  
  let arResults = [];
  for (let [i, objPrompt] of Object.entries (arPrompts))
    {
    console.log
      (
        (parseInt (i)+1) +" / "+ arPrompts.length +
        (objPrompt.name ? (": "+ objPrompt.name) : "")
      );
    
    try
      {
      let strGptAnswer = await getGptAnswer
        (
          objPrompt [argv.promptField],
          strToken,
          {
            timeout: argv.timeout,
            maxAttempts: argv.attempts
          }
        );
        
      objPrompt [argv.dialogField] = strGptAnswer;
      
      arResults.push (objPrompt);
      }
    catch (e)
      {
      inErrorsCount++;
      console.log ("Error: "+ e.name +": "+ e.message);
      }
    }
  
  strResult = JSON.stringify(arResults, null, "  ");
  try
    {
    fs.writeFileSync(argv.output, strResult);
    }
  catch (e)
    {
    process.stderr.write ("Error! Can't create the output file: "+ argv.output +"\n");
    process.exit ();
    }
  
  if (inErrorsCount == 0)
    console.log ("No errors");
  else
    console.log ("Errors: "+ inErrorsCount);
    
  let duration = Math.round ((new Date().getTime () - startTime)/10)/100;
  console.log ("Completed in "+ duration +" seconds");
  })();
