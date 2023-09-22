const {google} = require("googleapis")
const GoogleOAuth2 = require("google-oauth2-env-vars")

const {ENV_TOKEN_VAR} = require("./constants")
const {GoogleDocument} = require("./google-document")
const {writeDocumentToTests} = require("./write-document-to-tests")
const {fetchFiles} = require("./google-drive")

// const exportData = (data) => {
//   const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
//     JSON.stringify(data)
//   )}`;
//   const link = window.document.createElement("a");
//   link.href = jsonString;
//   link.download = "data.json";

//   link.click();
// };

async function fetchDocument(id) {
  console.log('-------------- >>>>>> ', id)
  const googleOAuth2 = new GoogleOAuth2({
    token: ENV_TOKEN_VAR,
  })
  const auth = await googleOAuth2.getAuth()

  const res = await google.docs({version: "v1", auth}).documents.get({
    documentId: id,
  })
  console.log(JSON.stringify(res))
  // exportData(res)
  
  // console.log('res title: ', res.data.title);
  // console.log('res body: ', res.data.body);
  // console.log('res content: ', res.data.body.content);
  // console.log('res paragraph: ', res.data.body.content[3].paragraph);
  // if (res.data.body.content.length) {
  //   console.log('content array: ',res.data.body.content.foreach(el => console.log(el.paragraph)))
  // }
  // console.log('res styles: ', res.data.documentStyle);

  if (!res.data) {
    throw new Error("Empty Data")
  }

  return res.data
}

/** @param {import('..').Options} options */
async function fetchDocuments({options, reporter}) {
  const timer = reporter.activityTimer(`source-google-docs: documents`)

  if (options.debug) {
    timer.start()
    timer.setStatus("fetching documents")
  }

  const documentsProperties = await fetchFiles(options)
  const links = documentsProperties.reduce(
    (acc, properties) => ({...acc, [properties.id]: properties.slug}),
    {}
  )

  const googleDocuments = await Promise.all(
    documentsProperties.map(async (properties) => {
      const document = await fetchDocument(properties.id)
      const googleDocument = new GoogleDocument({
        document,
        properties,
        options,
        links,
      })

      if (process.env.NODE_ENV === "DOCS_TO_TESTS") {
        writeDocumentToTests(googleDocument)
      }

      return googleDocument
    })
  )

  if (process.env.NODE_ENV === "DOCS_TO_TESTS") {
    process.exit()
  }

  if (options.debug) {
    timer.setStatus(googleDocuments.length + " documents fetched")
    timer.end()
  }

  return googleDocuments
}

module.exports = {
  fetchDocuments,
}
