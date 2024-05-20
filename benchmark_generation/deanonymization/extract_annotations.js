const fs = require('fs');
const yargs = require('yargs/yargs');

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

Array.prototype.max = function()
  {
  var i = 0;
  var tmp = this[i];
  for (i = 0; i < this.length; i++)
    {
    if(tmp < this[i])
      tmp = this[i];
    }
  return tmp;
  }

function matrix (m, n, initial)
  {
  var a, i, j, mat = [];
  for (i = 0; i < m; i += 1)
    {
    a = [];
    for (j = 0; j < n; j += 1)
      {
      a[j] = initial;
      }
    mat[i] = a;
    }
  return mat;
  };

function constructAlignment (sequence, reference, fncS)
  {
  var gap = -5;
  
  var fncS = fncS || function (a, b)
    {
    if (a == b)
      return (10);
    else
      return (-10)
    }
  
  var rows = reference.length + 1;
  var cols = sequence.length + 1;
  var a = matrix (rows, cols, 0);
  var i = 0, j = 0;
  var choice = [0, 0, 0];
  var ref = [];
  var seq = [];
  var score, score_diag, score_up, scroe_left;
  
  for(i = 1; i < rows; i++)
    {
    for(j = 1; j < cols; j++)
      {
      choice[0] = a[i-1][j-1] + fncS (reference[i-1], sequence[j-1]);
      choice[1] = a[i-1][j] + gap;
      choice[2] = a[i][j-1] + gap;
      a[i][j] = choice.max();
      }
    }

  i = reference.length;
  j = sequence.length;
  while (i > 0 && j > 0)
    {
    score = a[i][j];
    score_diag = a[i-1][j-1];
    score_up = a[i][j-1];
    score_left = a[i-1][j];
    if (score === (score_diag + fncS (reference[i-1], sequence[j-1])))
      {
      ref = [reference[i-1]].concat (ref);
      seq = [sequence[j-1]].concat (seq);
      i -= 1;
      j -= 1;
      }
    else if (score === (score_left + gap))
      {
      ref = [reference[i-1]].concat (ref);
      seq = ["_"].concat (seq);
      i -= 1;
      }
    else if (score === (score_up + gap))
      {
      ref = ["_"].concat (ref);
      seq = [sequence[j-1]].concat (seq);
      j -= 1;
      }
    }
  
  while(i > 0)
    {
    ref = [reference[i-1]].concat (ref);
    seq = ["_"].concat (seq);
    i -= 1;
    }
  
  while(j > 0)
    {
    ref = ["_"].concat (ref);
    seq = [sequence[j-1]].concat (seq);
    j -= 1;
    }
  
  return [seq, ref];
  };


function extract (strAnonymized, strDeanonymized)
  {
  strAnonymized   = strAnonymized.replace (/\_/g, " ");
  strDeanonymized = strDeanonymized.replace (/\_/g, " ");
  
  let [arAnonymizedAlignment, arDeanonymizedAlignment] = constructAlignment (strAnonymized, strDeanonymized);

  let strAnonymizedAlignment   = arAnonymizedAlignment.join ("");
  let strDeanonymizedAlignment = arDeanonymizedAlignment.join ("");

  let arFragments = [];
  
  //const GAPSYMBOL = "‐";
  //let rePlaceholder = new RegExp ("(("+GAPSYMBOL+"["+GAPSYMBOL+"\\s]*)?[\\#\*]([\\s"+GAPSYMBOL+"\\#\*]*[\\#\\*])?(["+GAPSYMBOL+"\\s]*"+GAPSYMBOL+")?)+", "g");
  
  // let rePlaceholder = /\-*[\#\*]\-*/g;
  // let rePlaceholder = /[\-\s]*[\#\*][\-\s]*/g;
  
  let rePlaceholder = /((\_[\_\s]*)?[\#\*]([\s\_\#\*]*[\#\*])?([\_\s]*\_)?)+/g;
  let arPlaceholderMatches = strAnonymizedAlignment.matchAll (rePlaceholder);

  for (let objMatch of arPlaceholderMatches)
    {
    let strAnonymizedTextInAlignment = objMatch [0];
    let strAnonymizedText = strAnonymizedTextInAlignment.replace (/\_/g, "");

    let intStartIndexInAlignment = objMatch.index;
    let intEndIndexInAlignment = intStartIndexInAlignment + strAnonymizedTextInAlignment.length;
    
    let strDeanonymizedText = strDeanonymizedAlignment.substring (intStartIndexInAlignment, intEndIndexInAlignment);
    
    let intStartIndexInAnonymized = strAnonymizedAlignment.substring (0, intStartIndexInAlignment).replace (/\_/g, "").length;
    let intEndIndexInAnonymized = intStartIndexInAnonymized + strAnonymizedText.length;
    
    let intStartIndexInDeanonymized = strDeanonymizedAlignment.substring (0, intStartIndexInAlignment).replace (/\_/g, "").length;
    let intEndIndexInDeanonymized = intStartIndexInDeanonymized + strDeanonymizedText.length;
      
    arFragments [arFragments.length] = 
      {
      startIndexInAlignment: intStartIndexInAlignment,
      endIndexInAlignment: intEndIndexInAlignment,
      
      startIndexInAnonymized: intStartIndexInAnonymized,
      endIndexInAnonymized: intEndIndexInAnonymized,
      
      startIndexInDeanonymized: intStartIndexInDeanonymized,
      endIndexInDeanonymized: intEndIndexInDeanonymized,
      
      anonymizedTextInAlignment: strAnonymizedTextInAlignment,
      
      anonymizedText: strAnonymizedText,
      deanonymizedText: strDeanonymizedText
      }
  
    //console.log (intStartIndex +" : "+ strAnonymizedText +" / "+ strDeanonymizedText);
    }
   
  return (
    {
    arAnonymizedAlignment,
    arDeanonymizedAlignment,
    arFragments
    });
  }

let strInputDialogs;
try
  {
  strInputDialogs = fs.readFileSync(argv.input, 'utf8');
  }
catch (e)
  {
  process.stderr.write ("Error! Can't read the input file: "+ argv.input +"\n");
  process.exit ();
  }

let arDialogs = JSON.parse (strInputDialogs);

arDialogs = arDialogs.slice (argv.from, argv.to);
arDialogs.length = Math.min ((argv.limit ?? arDialogs.length), arDialogs.length);

let arResults = [];

for (let [i, objDialog] of Object.entries (arDialogs))
  {
  console.log ("Dialog #"+ (parseInt (i)+1) +" / "+ arDialogs.length);

  let strAnonymized = objDialog.anonymized;
  
  let strDeanonymized;
  if (Array.isArray (objDialog.deanonymized))
    strDeanonymized = objDialog.deanonymized[0];
  else
    strDeanonymized = objDialog.deanonymized;
  
  let arFragments = extract (strAnonymized, strDeanonymized).arFragments;
  
  arFragments = arFragments.filter (objFragment => objFragment.deanonymizedText.match (/[А-Яа-яA-Za-z\d]/))
    
  objDialog.fragments = arFragments;
  
  arResults [arResults.length] =
    {
    ucid: objDialog.ucid,
    anonymized: strAnonymized,
    prompt: objDialog.prompt,
    deanonymized: strDeanonymized,
    entities: arFragments.map (objFragment => 
      ({
      startIndexInAnonymized: objFragment.startIndexInAnonymized,
      endIndexInAnonymized: objFragment.endIndexInAnonymized,
      startIndexInDeanonymized: objFragment.startIndexInDeanonymized,
      endIndexInDeanonymized: objFragment.endIndexInDeanonymized,
      anonymizedTextInAlignment: objFragment.anonymizedTextInAlignment,
      anonymizedText: objFragment.anonymizedText,
      deanonymizedText: objFragment.deanonymizedText
      }))
    };
    
  }

let strResult = JSON.stringify(arResults, null, "  ");
try
  {
  fs.writeFileSync(argv.output, strResult);
  }
catch (e)
  {
  process.stderr.write ("Error! Can't create the output file: "+ argv.output +"\n");
  process.exit ();
  }
