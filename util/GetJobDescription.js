const fetchAndParse = require('./scraper')
const validateUrl = require('./UrlCheck')

async function jobDescription (request, OPENAI_API_KEY) {
    let jobDescriptionText = ''
    console.log(validateUrl(request.body.job))
    if (validateUrl(request.body.job)){
        try{
            jobDescriptionText = await Promise.allSettled([fetchAndParse(request.body.job)])
        }catch(error){
            res.status(500).send({message:error})
        }
    }else{
        options = {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "content-Type": "application/json"
            },
            body: JSON.stringify({
                model:"gpt-3.5-turbo",
                messages: [{role:"system",content:"you are a helpful Job coach"},{role: "user", content: `if the text between inside the html div tag is a job description return the word "TRUE". Otherwise,return the word "FALSE".\n<div>\n  ${request.body.job} \n </div>`}],
                temperature: 0,
                max_tokens: 2000,
            })
        }
        try{
            const response = await fetch("https://api.openai.com/v1/chat/completions", options)
            const data = await response.json()
            console.log(data)
            let content = data.choices[0].message.content.toString()
            console.log(content)
            if (content == "TRUE"){
                jobDescriptionText = request.body.job
                // console.log(jobDescriptionText)
                return request.body.job
            }else{
                res.status(500).json({message:"looks like that was neither a valid job description or a url. please try again"})
            }
        }catch(error){
            console.log(error)
        } 
    }
}
module.exports = jobDescription