const axios = require('axios');
const fs = require('fs');
const path = require('path');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

// readline.question('Please enter Uri: ', inputUri => {
//     console.log(`Hey let me check for  ${inputUri}!`);
//     getUriData(inputUri)
//     readline.close();
// });
const inputUri = 'https://semantify.it/list/J6sJg_D8V';

const getUriData = (inputUri) => {
    axios.get(inputUri + '?representation=lean')
        .then(res => {
            const list = res.data;
            main(list);
        })
        .catch(err => {
            console.log(err);
        });
}
getUriData(inputUri);

const main = (list) => {
    let listResult = {}
    listResult.name = list['schema:name'];
    listResult.link = list['@id'];
    listResult['@id'] = listResult['link'].substring(`${listResult['link'].lastIndexOf('/') + 1}`);
    listResult.desc = list['schema:description'];
    listResult.nameLink = `[${listResult.name}](${listResult.link})`;

    if (list['schema:author']) {
        listResult['author'] = list['schema:author']
        if (listResult['author']['schema:memberOf']) {
            listResult['author'] = listResult['author']['schema:memberOf']['schema:name']
        } else {
            listResult['author'] = listResult['schema:name'];
        }
    } else {
        console.log('Author not found')
    }


    const DsData = {}

    if (list['schema:hasPart']) {
        list['schema:hasPart'].forEach((ds, index) => {

            const dsId = ds['@id'].substring(`${ds['@id'].lastIndexOf('/') + 1}`);
            axios.get(`https://semantify.it/ds/${dsId}`)
                .then(res => {
                    const ds = res.data;
                    writeDsFiles(dsId, ds, listResult['@id'])
                })
                .catch(err => {
                    console.log(`Couldn't get DS from Uri`)
                });

            DsData['DsName' + (index + 1)] = ds['schema:name'];
            DsData['DsId' + (index + 1)] = dsId;
            DsData['DsUri' + (index + 1)] = ds['@id'];
            DsData['DsDesc' + (index + 1)] = ds['schema:description'];
            DsData['DsDownLink' + (index + 1)] = `[${dsId}](./${dsId}.json)`
        });
    } else {
        console.log('DomainSpecifications not found!');
    }


    listResult = {...listResult, DsData}

//    console.log(listResult);
    goToWriteFile(list, listResult)
}

const goToWriteFile = (list, listResult) => {
    try {
        fs.mkdirSync(path.join(__dirname, listResult['@id']), {recursive: true});
        console.log(`Directory named ${listResult['@id']} created!`);
    } catch {
    }

//TODO

    let dsArray = [];

    let contentMdFile =
        `List Name: ${listResult.name}\nList Name: [${listResult.name}](${listResult.link})\nList Description: ${listResult.desc}\n DS List:\n
| Name | URI  | Description  | Download  | 
|-------|-----|-------|-------| \n `
// | obj['Name']  | obj['URI']  | obj['Description']  | obj['Download'] |\ `;

    list['schema:hasPart'].forEach((ds, index) => {
        let obj = {}
        let dsId = ds['@id'].substring(`${ds['@id'].lastIndexOf('/') + 1}`);
        obj['Name'] = `[${ds['schema:name']}](${ds['@id']})`;
        obj['URI'] = dsId;
        obj['Description'] = ds['schema:description'];
        obj['Download'] = `[${dsId}](./${dsId}.json)`;
        dsArray.push(obj)

        contentMdFile = `${contentMdFile}  | ${obj['Name']}  | ${obj['URI']}  | ${obj['Description']}  | ${obj['Download']} |\n`


        // DsData['DsName' + (index + 1)] = ds['schema:name'];
        // DsData['DsId' + (index + 1)] = dsId;
        // DsData['DsUri' + (index + 1)] = ds['@id'];
        // DsData['DsDesc' + (index + 1)] = ds['schema:description'];
        // DsData['DsDownLink' + (index + 1)] = `[${dsId}](./${dsId}.json)`
    })


//    listResult = {...listResult, dsArray}

    console.log(contentMdFile);

    try {
        fs.writeFileSync(`./${listResult['@id']}/` + listResult['@id'] + '.md', contentMdFile);
        console.log(`Results are written in ${listResult['@id'] + '.md'} file`);
    } catch {
        console.log(`Failed to write into ${listResult['@id']}.md file`)
    }
}

const writeDsFiles = (dsId, ds, dirName) => {
    try {
        fs.writeFileSync(`./${dirName}/` + dsId + '.json', JSON.stringify(ds, null, 4))
        console.log(`DS file named ${dsId + '.json'} is created`);
    } catch {
        console.log('Error in writing')
    }
}