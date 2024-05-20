/*
The script constructs prompts for generating synthetic dialogs between a company
representative and the bank customer support. A prompt is complemented by annotation, i.e.
a list of entities that has to be mentioned in the dialogs. Information about entities
is extracted from a local copy of DBpedia accessed via a local SPARQL endpoint.
*/

const fs = require('fs');
const yargs = require('yargs/yargs');
const ldflex = require('ldflex');
const asynchandlers = require('@ldflex/async-iteration-handlers');
const lodash = require('lodash');
const sleep = require('sleep-promise');

const LDflexEngine = require('@ldflex/comunica').default;
const ComunicaQueryEngine = require('@comunica/query-sparql').QueryEngine;

const argv = yargs(require('yargs/helpers').hideBin(process.argv))
  .options
    ({
    output:
      {
      alias: "o",
      type: "string",
      requiresArg: true,
      demandOption: true
      },
    endpoint:
      {
      alias: "e",
      type: "string",
      requiresArg: true,
      default: "http://localhost:8890/sparql"
      },
    limit:
      {
      alias: "l",
      type: "number",
      requiresArg: true
      },
    offset:
      {
      alias: "s",
      type: "number",
      requiresArg: true,
      default: 0
      },
    allFieldsRequred:
      {
      alias: "r",
      type: "boolean",
      default: false
      }
    })
  .argv;

const strSparqlEndpoint = argv.endpoint;

const objContext = 
  {
  "@context":
    {
    "@vocab": "http://dbpedia.org/ontology/",
    "@language": "en",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "dbo": "http://dbpedia.org/ontology/",
    }
  };

const objLDflexEngine = new LDflexEngine (strSparqlEndpoint);
const objComunicaQueryEngine = new ComunicaQueryEngine ();

const objPath = new ldflex.PathFactory
  ({
  context: objContext,
  queryEngine: objLDflexEngine,
  handlers:
    {
    ...ldflex.defaultHandlers,
    ...asynchandlers.default
    }
  });

function getRandomElement (array)
  {
  //if (array && array.length > 0)
    return (array[Math.floor(Math.random()*array.length)]);
  }

async function query (strQuery)
  {
  let arBindings = await
    (
    await objComunicaQueryEngine.queryBindings
      (
        strQuery
        ,
        {
          sources: [strSparqlEndpoint],
        }
      )
    )
  .toArray();
    
  return (arBindings);
  }
  
async function trySeveralTimes
  (
    func,
    intAttempts = 7,
    fncDelay = (intAttemptNumber => intAttemptNumber * intAttemptNumber * 1000)
  )
  {
  let erError;
  for (let intAttemptNumber = 0; intAttemptNumber < intAttempts; intAttemptNumber++)
    {
    try
      {
      await func ();
      if (intAttemptNumber > 0) process.stderr.write ("Attempt #"+ (intAttemptNumber+1) +" / "+ intAttempts +" succeeded!\r\n");
      erError = null;
      break;
      }
    catch (e)
      {
      process.stderr.write ("Attempt #"+ (intAttemptNumber+1) +" / "+ intAttempts +" failed! "+ e.name +": "+ e.message +"\r\n");
      erError = e;
      if (intAttemptNumber < intAttempts-1)
        {
        await sleep (fncDelay (intAttemptNumber));
        }
      }
    }
    
  if (erError)
    {
    throw (erError);
    }
  }

function generatePrompt
  (
    {
    strCompanyName,
    strIndustryName,
    intNumberOfEmployees,
    strHeadquarterName,
    arRelatedCompanies
    }
  )
  {
  const arProblems = 
    [
    "account opening inquiry",
    "transaction dispute resolution",
    "loan application consultation",
    "balance verification request",
    "credit card replacement",
    "international transaction assistance",
    "online banking setup",
    "business account upgrade",
    "unauthorized withdrawal investigation",
    "account closure process",
    "foreign currency exchange",
    "merchant services setup",
    "overdraft protection inquiry",
    "tax payment assistance",
    "fraud alert activation",
    "business savings account opening",
    "financial planning consultation",
    "business credit line application",
    "ach payment setup",
    "mobile banking app troubleshooting"
    ];
  
  const arCharacters =
    [
    "energetic and enthusiastic",
    "cautious and detail-oriented",
    "friendly and personable",
    "analytical and data-driven",
    "nervous and hesitant",
    "impatient and rushed",
    "pessimistic and negative"
    ];
  
  let strPrompt = "";
  
  let strProblem = getRandomElement (arProblems);
  let strCharacter = getRandomElement (arCharacters);
  
  strPrompt += "Consider a company called '"+ strCompanyName +"', operating in the "+ strIndustryName +" industry. ";
  
  if (strHeadquarterName && intNumberOfEmployees)
    strPrompt += "It is based in "+ strHeadquarterName +" and has "+ intNumberOfEmployees +" employees. ";
  else if (strHeadquarterName)
    strPrompt += "It is based in "+ strHeadquarterName +". ";
  else if (intNumberOfEmployees)
    strPrompt += "It has "+ intNumberOfEmployees +" employees. ";
    
  strPrompt += "Write a long dialogue between a company's representative and a bank customer support. ";
  
  strPrompt += "The main topic of the dialog is "+ strProblem +". ";
  
  strPrompt += "The dialogue should reflect the industry the company operates in, where the company is based, and the size of the company. ";
  
  strPrompt += "The dialog should also mention ";
  let arRelatedCompaniesPrompts = [];
  for (let {strCompanyName, strIndustryName} of arRelatedCompanies)
    {
    arRelatedCompaniesPrompts.push ("the company called '"+ strCompanyName +"' operating in the "+ strIndustryName +" industry");
    }

  strPrompt += (new Intl.ListFormat('en', { style: 'long', type: 'conjunction' })).format (arRelatedCompaniesPrompts) +". ";
  
  strPrompt += "The company's representative is "+ strCharacter +".";

  return (strPrompt);
  }

(async () =>
  {  
  let startTime = new Date().getTime ();
  
  let arResults = [];
  
  let arCompaniesBindings = await query
    (
    `
    PREFIX dbo: <http://dbpedia.org/ontology/>

    SELECT DISTINCT ?company ?companyName WHERE
      {
      ?company
        rdf:type dbo:Company;
        rdfs:label ?companyName.
    
      ?company dbo:industry ?industry.
      
      ${
        argv.allFieldsRequred ?
          "?company dbo:headquarter ?headquarter. "+
          "?company dbo:numberOfEmployees ?numberOfEmployees."
        :
          ""
       }

      #?company dbo:headquarter ?headquarter.
      #?company dbo:numberOfEmployees ?numberOfEmployees.

      ?company dbo:wikiPageWikiLink ?company2.

      ?company2
        rdf:type dbo:Company;
        dbo:industry ?industry2.

      FILTER (lang (?companyName) = "en")
      }
    ORDER BY ?companyName
    OFFSET ${argv.offset}
    ${(argv.limit ? ("LIMIT "+ argv.limit) : "")}
    `
    );
  
  for (let [i, objCompanyBinding] of Object.entries (arCompaniesBindings))
    {
    console.log ((i*1+1) +" / "+ arCompaniesBindings.length +": "+ objCompanyBinding.get ("companyName").value)
    
    await trySeveralTimes (async () =>
      {
      //console.log (objCompanyBinding.get('company').value);
    
      let nodCompany = objCompanyBinding.get ("company");
      let ldfCompany = objPath.create ({subject: nodCompany});
    
      let strCompanyUri = nodCompany.value;
      //let strCompanyName = await ldfCompany ["rdfs:label"].value;
      let strCompanyName = objCompanyBinding.get ("companyName").value;
      let intNumberOfEmployees = await ldfCompany ["dbo:numberOfEmployees"].value*1;
    
      let ldfHeadquarter = await ldfCompany ["dbo:headquarter"];
      let strHeadquarterUri = ldfHeadquarter?.value;
      let strHeadquarterName = await ldfHeadquarter?.["rdfs:label"].value;
    
      let arLdfIndustries = await ldfCompany ["dbo:industry"].map (async prsIndustry => prsIndustry);
      let ldfIndustry = getRandomElement (arLdfIndustries);
    
      //let ldfIndustry = await ldfCompany ["dbo:industry"];
      let strIndustryUri = ldfIndustry.value;
      let strIndustryName = await ldfIndustry ["rdfs:label"].value;
    
      let arRelatedCompanies = [];
      let arRelatedCompaniesBindings = await query
        (
          `
          PREFIX dbo: <http://dbpedia.org/ontology/>
    
          SELECT DISTINCT ?company ?companyName WHERE
            {
            <${strCompanyUri}> dbo:wikiPageWikiLink ?company.
      
            ?company
              rdf:type dbo:Company;
              rdfs:label ?companyName.
            
            ?company dbo:industry ?industry.
          
            FILTER (lang (?companyName) = "en")
            }
          LIMIT 5
          `
        );    
    
      for (let objRelatedCompanyBinding of arRelatedCompaniesBindings)
        {
        let nodCompany = objRelatedCompanyBinding.get ("company");
        let ldfCompany = objPath.create ({subject: nodCompany});
      
        let strCompanyUri = nodCompany.value;
        let strCompanyName = objRelatedCompanyBinding.get ("companyName").value;
      
        let arLdfIndustries = await ldfCompany ["dbo:industry"].map (async prsIndustry => prsIndustry);
        let ldfIndustry = getRandomElement (arLdfIndustries);
      
        //let ldfIndustry = await ldfCompany ["dbo:industry"];
        let strIndustryUri = ldfIndustry.value;
        let strIndustryName = await ldfIndustry ["rdfs:label"].value;
      
        arRelatedCompanies.push
          ({
          strCompanyUri,
          strCompanyName,
          strIndustryUri,
          strIndustryName
          });
        }
      //console.log (strCompanyName +" : "+ strIndustryName +" : "+ strHeadquarterName);
    
      //console.log ("");
    
      let arCompanies =
        [
          {
          name: strCompanyName,
          uri: strCompanyUri
          }
        ]
      .concat
        (
        arRelatedCompanies.map (objCompany =>
          ({
          name: objCompany.strCompanyName,
          uri: objCompany.strCompanyUri
          }))
        );
    
      let arIndustries = 
        [
          {
          name: strIndustryName,
          uri: strIndustryUri
          }
        ]
      .concat
        (
        arRelatedCompanies.map (objCompany =>
          ({
          name: objCompany.strIndustryName,
          uri: objCompany.strIndustryUri
          }))
        );
      arIndustries = lodash.uniqBy (arIndustries, "uri");
    
      let arHeadquarters = [];
      if (strHeadquarterUri)
        {
        arHeadquarters =
          [
            {
            name: strHeadquarterName,
            uri: strHeadquarterUri
            }
          ];
        }
    
      let objEntities =
        {
        companies: arCompanies,
        industries: arIndustries,
        locations: arHeadquarters
        };
    
      let strPrompt = generatePrompt
        ({
        strCompanyName,
        strIndustryName,
        intNumberOfEmployees,
        strHeadquarterName,
        arRelatedCompanies
        });
      
      arResults.push
        ({
        name: strCompanyName,
        uri: strCompanyUri,
        entities: objEntities,
        prompt: strPrompt
        });
      });
    }
  
  let duration = Math.round ((new Date().getTime () - startTime)/10)/100;
  console.log ("Completed in "+ duration +" seconds");
  
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
  })();
  
