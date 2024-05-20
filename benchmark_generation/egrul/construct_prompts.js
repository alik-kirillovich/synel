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

// console.log (JSON.stringify(argv, null, "  "));
// process.exit ();

function getRandomElement (array)
  {
  //if (array && array.length > 0)
    return (array[Math.floor(Math.random()*array.length)]);
  }

let arProblems = 
  [
  "открытие счета",
  "заявка на кредит",
  "проверка баланса",
  "замена кредитной карты",
  "настройка онлайн-банкинга",
  "закрытие счета",
  "обмен валюты",
  "оплата налогов",
  "активация оповещения о мошенничестве"
  ];
  
let arCharacters =
  [
  "энергичный",
  "внимательный к деталям",
  "дружелюбный",
  "аналитический и ориентированный на данные",
  "нервный и нерешительный",
  "нетерпеливый",
  "пессимистичный"
  ];
  
function generatePrompt
  (
    {
    strCompanyName,
    strIndustry,
    strHeadquarters,
    strCapital,
    arCompetitors
    }
  )
  {
  let strProblem = getRandomElement (arProblems);
  let strCharacter = getRandomElement (arCharacters);
  
  let arCompetitorsNames = 
    arCompetitors
      .map (objCompetitor => objCompetitor.mention);
   
  let strCompetitors = 
    (new Intl.ListFormat('ru', { style: 'long', type: 'conjunction' })).format (arCompetitorsNames);

  //strCompanyName = strCompanyName.replace (/(?:ООО|ЗАО|ОАО)\s+\"(.+)\"/gm, "$1");
  
  let strPrompt = "";
    strPrompt += "Рассмотрим компанию "+ strCompanyName +", сфера деятельности которой: "+ strIndustry +". ";
    strPrompt += "Компания расположена по адресу "+ strHeadquarters +" и имеет капитал "+ strCapital +". ";
    strPrompt += "Напиши диалог между представителем компании и службой поддержкой банка. ";
    strPrompt += "Основная тема диалога: "+ strProblem +", однако в диалоге должны обсуждаться также и другие темы. ";
    strPrompt += "Диалог должен отражать сферу деятельности компании, ее местоположение и размер капитала. ";
    strPrompt += "Также в диалоге должны упоминаться следующие компании: "+ strCompetitors +". ";
  
  return (strPrompt);
  }
  
let strCompanies;
try
  {
  strCompanies = fs.readFileSync(argv.input, 'utf8');
  }
catch (e)
  {
  process.stderr.write ("Error! Can't read the input file: "+ argv.input +"\n");
  process.exit ();
  }

let arCompanies = JSON.parse (strCompanies);

arCompanies = arCompanies.slice (argv.from, argv.to);
arCompanies.length = Math.min ((argv.limit ?? arCompanies.length), arCompanies.length);

arCompanies = arCompanies.filter
  (
  objCompany =>
    objCompany.INN &&
    objCompany.short_name &&
    objCompany.activities &&
    (objCompany.address || objCompany.juridical_address) &&
    objCompany.finances &&
    objCompany.competitors &&
    objCompany.competitors.find (objCompetitors => objCompetitors.inn > 0) &&
    objCompany.finances.find (point => point.name == "Капитал и резервы")
  );

(async () =>
  {
  let arResults = [];

  //arCompanies.length = 5;

  for await (let objCompany of arCompanies)
    {
    let strCompanyName = objCompany.short_name;
    let strInn = objCompany.INN;
    let strIndustry = getRandomElement (objCompany.activities).description.replace (/\?/gm, "");
    let strHeadquarters = objCompany.address || objCompany.juridical_address;
  
    let intCapital = 
      objCompany
        .finances
        .filter (point => point.name == "Капитал и резервы")
        .sort ((point1, point2) => (point2.year - point1.year))
        [0]
        .price;
    
    let strCapital = intCapital +" рублей";
  
    let arCompetitors =
      objCompany.competitors
        .filter (objCompetitor => objCompetitor.inn > 0)
        .filter (objCompetitor => objCompetitor.short_name)
        .slice (0, Math.min (objCompany.competitors.length, 3));
    
    arCompetitors.forEach (objCompetitor =>
      {
      objCompetitor.mention = 
        objCompetitor.short_name
          .replace (/(?:ООО|ЗАО|ОАО|АО)\s+\"(.+)\"/gm, "$1")
          .replace (/\"/gm, "")
      })
    
    let strPrompt = generatePrompt
      (
        {
        strCompanyName,
        strIndustry,
        strHeadquarters,
        strCapital,
        arCompetitors
        }
      );
    
    let arMentionedCompainies =
      [
        {
        inn: strInn,
        name: strCompanyName,
        mention: strCompanyName
        }
      ].
    concat
      (
      arCompetitors.map (objCompetitor =>
        ({
        inn: objCompetitor.inn,
        name: objCompetitor.short_name,
        mention: objCompetitor.mention
        }))
      );
    
    arResults.push 
      ({
      inn: strInn,
      name: strCompanyName,
      entities:
        {
        compamies: arMentionedCompainies,
        industries: [strIndustry],
        locations: [strHeadquarters],
        money: [strCapital]
        },
      prompt: strPrompt
      });
    
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
  })();

