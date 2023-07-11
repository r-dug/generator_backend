const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { By } = require('selenium-webdriver');

async function fetchAndParse(url) {
    try{
        const driver = new webdriver.Builder()
            .withCapabilities(webdriver.Capabilities.chrome())
            .build();
        
        await driver.get(url);
        
        const divs = await driver.findElements(By.id('jobDescriptionText'));
        let text = ''
        for (const div of divs) {
            text = await div.getText()
        }
        await driver.quit()
        return text
        
    }catch(error){
        console.error("Sorry, we were unable to find a job description at the URL provided \n",error)
    }
}

module.exports = fetchAndParse