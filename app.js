const axios = require('axios');
const fs = require('fs');
const path = require('path');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

//Ask user for URI in terminal
readline.question('Please enter Uri: ', inputUri => {
    console.log(`Hey let me check for  ${inputUri}!`);
    getUriList(inputUri)
    readline.close();
});

//const inputUri = 'https://semantify.it/list/J6sJg_D8V';
// request to get list Data from Uri
const getUriList = (inputUri) => {
    axios.get(inputUri + '?representation=lean')
        .then(res => {
            const list = res.data;
            getListData(list);
        })
        .catch(err => {
            console.log(err);
        });
}
// get List data for the user entered URI
const getListData = (list) => {
    let listResult = {}
    listResult.name = list['schema:name'];
    listResult.uri = list['@id'];
    listResult['@id'] = listResult['uri'].substring(`${listResult['uri'].lastIndexOf('/') + 1}`);
    listResult.desc = list['schema:description'];
    listResult.nameLink = `[${listResult.name}](${listResult.link})`;

    if (list['schema:author']) {
        listResult['author'] = list['schema:author']
        if (listResult['author']['schema:memberOf']) {
            listResult['author'] = listResult['author']['schema:memberOf']['schema:name']
        } else {
            listResult['author'] = listResult['schema:name'];
            console.log(`Author doesn't belong to any organization`)
        }
    } else {
        console.log('Author not found')
    }

    //if List has domainspecifictaion the will get each ds with the from external source
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
        });
    } else {
        console.log('DomainSpecifications not found!');
    }
    writeListFile(list, listResult)
}
// write data into .md file about list and its ds after created directory named uriID
const writeListFile = (list, listResult) => {
    try {
        fs.mkdirSync(path.join(__dirname, listResult['@id']), {recursive: true});
        console.log(`Directory named ${listResult['@id']} created!`);
    } catch {
        console.log(`Error is making directory named ${listResult['@id']}`)
    }
// This is the content which will be written into .md file
    let contentMdFile =
        `List Name: ${listResult.name} \n 
        List Name: [${listResult.name}](${listResult.link}) \n 
        List Description: ${listResult.desc} \n 
        DS List: \n
| Name | URI  | Description  | Download  | 
|-------|-----|-------|-------| \n `

    list['schema:hasPart'].forEach((ds, index) => {
        let obj = {}
        const dsId = ds['@id'].substring(`${ds['@id'].lastIndexOf('/') + 1}`);
        obj['Name'] = `[${ds['schema:name']}](${ds['@id']})`;
        obj['URI'] = dsId;
        obj['Description'] = ds['schema:description'];
        obj['Download'] = `[${dsId}](./${dsId}.json)`;

        contentMdFile = `${contentMdFile}  | ${obj['Name']}  | ${obj['URI']}  | ${obj['Description']}  | ${obj['Download']} |\n`
    })

    try {
        fs.writeFileSync(`./${listResult['@id']}/` + listResult['@id'] + '.md', contentMdFile);
        console.log(`Results are written in ${listResult['@id'] + '.md'} file`);
    } catch {
        console.log(`Failed to write into ${listResult['@id']}.md file`)
    }
}
// save all ds files inside same repo each named as dsId
const writeDsFiles = (dsId, ds, dirName) => {
    try {
        fs.writeFileSync(`./${dirName}/` + dsId + '.json', JSON.stringify(ds, null, 4))
        console.log(`DS file named ${dsId + '.json'} created in directory ${dirName}`);
    } catch {
        console.log('Error in writing domain specification')
    }
}