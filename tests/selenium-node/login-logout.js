var webdriver = require('selenium-webdriver');
    SeleniumServer = require('selenium-webdriver/remote').SeleniumServer;

var server = new SeleniumServer("/var/lib/selenium-server-standalone-2.43.0.jar", {
  port: 4444
});

server.start();

var driver = new webdriver.Builder().
    usingServer(server.address()).
    withCapabilities(webdriver.Capabilities.firefox()).
    build();
 
driver.get('http://localhost:3000');
driver.findElement(webdriver.By.id('about')).click();
driver.wait(function() {
     return driver.isElementPresent(webdriver.By.id('btn_right'));
}, 4000);
driver.findElement(webdriver.By.id('btn_right')).click();
driver.findElement(webdriver.By.id('btn_left')).click();
driver.findElement(webdriver.By.id('btn_close')).click();


driver.get('http://localhost:3000');
driver.findElement(webdriver.By.id('google')).click();
driver.findElement(webdriver.By.id('Email')).sendKeys('arsnovaflashcards');
driver.findElement(webdriver.By.id('Passwd')).sendKeys('cardsARS!');
driver.findElement(webdriver.By.id('signIn')).click();
driver.wait(function() {
     return driver.findElement(webdriver.By.id('submit_approve_access')).isEnabled();
}, 8000);
driver.findElement(webdriver.By.id('submit_approve_access')).click();
driver.wait(function() {
     return driver.isElementPresent(webdriver.By.id('usr-name'));
}, 4000);
driver.findElement(webdriver.By.id('usr-name')).click();
driver.findElement(webdriver.By.id('logout')).click();

driver.quit();
