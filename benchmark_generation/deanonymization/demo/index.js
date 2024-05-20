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

Array.matrix = function (m, n, initial)
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

var needle = function(sequence, reference, fncS)
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
  var a = Array.matrix(rows, cols, 0);
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
      seq = ["-"].concat (seq);
      i -= 1;
      }
    else if (score === (score_up + gap))
      {
      ref = ["-"].concat (ref);
      seq = [sequence[j-1]].concat (seq);
      j -= 1;
      }
    }
  
  while(i > 0)
    {
    ref = [reference[i-1]].concat (ref);
    seq = ["-"].concat (seq);
    i -= 1;
    }
  
  while(j > 0)
    {
    ref = ["-"].concat (ref);
    seq = [sequence[j-1]].concat (seq);
    j -= 1;
    }
  
  return [seq, ref];
  };


function extract (strAnonymized, strDeanonymized)
  {
  let [arAnonymizedAlignment, arDeanonymizedAlignment] = needle (strAnonymized, strDeanonymized);

  let strAnonymizedAlignment   = arAnonymizedAlignment.join ("");
  let strDeanonymizedAlignment = arDeanonymizedAlignment.join ("");

  let arFragments = [];

  // let rePlaceholder = /\-*[\#\*]\-*/g;
  // let rePlaceholder = /[\-\s]*[\#\*][\-\s]*/g;
  let rePlaceholder = /(\-[\-\s]*)*[\#\*]([\-\s]*\-)*((\-[\-\s]*)*[\#\*]([\-\s]*\-)*)*/g;
  let arPlaceholderMatches = strAnonymizedAlignment.matchAll (rePlaceholder);

  for (let objMatch of arPlaceholderMatches)
    {
    let intStartIndex = objMatch.index;
    let strAnonymizedText = objMatch [0];
    let intEndIndex = intStartIndex + strAnonymizedText.length;
    let strDeanonymizedText = strDeanonymizedAlignment.substring (intStartIndex, intEndIndex);
  
    arFragments [arFragments.length] = 
      {
      startIndex: intStartIndex,
      endIndex: intEndIndex,
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

function printResult (strAnonymized, strDeanonymized)
  {
  let {arAnonymizedAlignment, arDeanonymizedAlignment, arFragments} = extract (strAnonymized, strDeanonymized);
  
  document.write ("<h2>Извлеченные сущности</h2>");
  document.write ("<ul>");

  for (let objFragment of arFragments)
    {
    document.write ("<li>"+ objFragment.deanonymizedText +"</li>")
    }
  
  document.write ("</ul>");

  document.write ("<h2>Текст</h2>");

  for (let i = 0; i < arAnonymizedAlignment.length; i++)
    {
    let strBackground = "";
    let objFragment =
      arFragments
        .find (objFragment => (objFragment.startIndex <= i && objFragment.endIndex > i));
  
    //console.log (i +": "+ objFragment +" : ")
  
    if (objFragment)
      strBackground = "background-color: yellow;";
    
    let strColor1 = "";  
    let strColor2 = "";  
    if (arAnonymizedAlignment [i] != arDeanonymizedAlignment [i] && strBackground == "")
      strColor1 = strColor2 = "color: red; ";
      
    if (arAnonymizedAlignment [i] == "-")
      strColor1 = "color: gray; ";
    if (arDeanonymizedAlignment [i] == "-")
      strColor2 = "color: gray; ";
      
    let strWeight1 = "";
    let strWeight2 = "";
    
    if (arAnonymizedAlignment [i] == "#" || arAnonymizedAlignment [i] == "*")
      strWeight1 = "font-weight: bold; ";
    if (arDeanonymizedAlignment [i] == "#" || arDeanonymizedAlignment [i] == "*")
      strWeight2 = "font-weight: bold; ";
  
    let strPairHtml = "";
      strPairHtml += "<table style = 'float: left; font-family: Courier New; border: 0px solid gray; border-spacing: 0px; "+ strBackground +"; padding-left: 0px; padding-right: 0px; margin-left: 0px; margin-right: 0px; margin-bottom: 1em'>";
        strPairHtml += "<tr>";
          strPairHtml += "<td style = '"+ strColor1 +"; "+ strWeight1 +"; border: 0px; padding-left: 0px; padding-right: 0px; margin-left: 0px; margin-right: 0px;'>";
            strPairHtml += arAnonymizedAlignment [i].split(" ").join("&nbsp;");
          strPairHtml += "</td>";
        strPairHtml += "</tr>";
        strPairHtml += "<tr>";
          strPairHtml += "<td style = '"+ strColor2 +"; "+ strWeight2 +"; border: 0px solid gray; padding-left: 0px; padding-right: 0px; margin-left: 0px; margin-right: 0px;'>";
            strPairHtml += arDeanonymizedAlignment [i].split(" ").join("&nbsp;");
          strPairHtml += "</td>";
        strPairHtml += "</tr>";
      strPairHtml += "</table>";
    
    document.write (strPairHtml);
    }
  }