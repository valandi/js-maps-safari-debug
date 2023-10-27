'use strict'

const { Builder, By } = require('selenium-webdriver');
const { Eyes, 
    ClassicRunner,
    VisualGridRunner, 
    RunnerOptions,
    Target, 
    RectangleSize, 
    Configuration, 
    BatchInfo,
    BrowserType,
    ScreenOrientation,
    DeviceName, 
    StitchMode} = require('@applitools/eyes-selenium');

describe('ACME Bank', () => {
    const USE_ULTRAFAST_GRID = true;
    const USE_EXECUTION_CLOUD = false;
    
    // Test control inputs to read once and share for all tests
    var applitoolsApiKey;
    var headless;

    // Applitools objects to share for all tests
    let batch;
    let config;
    let runner;
    
    // Test-specific objects
    let driver;
    let eyes;

    before(async () => {
        applitoolsApiKey = process.env.APPLITOOLS_API_KEY;
        headless = process.env.HEADLESS? ['headless'] : []

        if (USE_ULTRAFAST_GRID) {
            runner = new VisualGridRunner(new RunnerOptions().testConcurrency(5));
        }
        else {
            // Create the classic runner.
            runner = new ClassicRunner();
        }

        const runnerName = (USE_ULTRAFAST_GRID) ? 'Ultrafast Grid' : 'Classic runner';
        batch = new BatchInfo(`Apple Business ${runnerName}`);

        // Create a configuration for Applitools Eyes.
        config = new Configuration();

        config.setApiKey(applitoolsApiKey);

        config.setVisualGridOption('safari:hideBackdropFilter', true)
        // Set the batch for the config.
        config.setBatch(batch);
        config.setStitchMode(StitchMode.CSS);

        if (USE_ULTRAFAST_GRID) {

            // Add 3 desktop browsers with different viewports for cross-browser testing in the Ultrafast Grid.
            // Other browsers are also available, like Edge and IE.
            config.addBrowser(800, 600, BrowserType.CHROME);
            config.addBrowser(1600, 1200, BrowserType.FIREFOX);
            config.addBrowser(1024, 768, BrowserType.SAFARI);
            config.addBrowser(1920, 1080, BrowserType.SAFARI);
        
            // Add 2 mobile emulation devices with different orientations for cross-browser testing in the Ultrafast Grid.
            // Other mobile devices are available, including iOS.
            config.addDeviceEmulation(DeviceName.Pixel_2, ScreenOrientation.PORTRAIT);
            config.addDeviceEmulation(DeviceName.Nexus_10, ScreenOrientation.LANDSCAPE);
        }
    });
    
    beforeEach(async function() {
        var capabilities = {
            browserName: 'chrome',
            'goog:chromeOptions': {
                args: headless,
            },
        };

        if (USE_EXECUTION_CLOUD) {
            let url = await Eyes.getExecutionCloudUrl();
            driver = new Builder().usingServer(url).withCapabilities(capabilities).build();
        }
        else {
            driver = new Builder().withCapabilities(capabilities).build();
        }

        await driver.manage().setTimeouts( { implicit: 10000 } );

        eyes = new Eyes(runner);
        eyes.setConfiguration(config);

        await eyes.open(
            driver,
            'Apple Business',
            this.currentTest.fullTitle(),
            new RectangleSize(1200, 600)
        );
    })

    it('Apple', async () => {

        await driver.get("https://businessconnect.apple.com/onboarding?changeType=true");

        await new Promise(resolve => setTimeout(resolve, 30000));  // Handle login and 2FA

        await eyes.check(Target.window().fully().withName("Full page"));
        
        const element = await driver.findElement(By.css('#bpl-header-body > div > div.motion-fadeIn-moveIn-fromBottom.u-animate-fill-backwards.animated-item-1 > div'));
        await element.click();


        await driver.executeScript(`
            const getContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes = {}) {
            if (['webgl', 'experimental-webgl', 'webgl2'].includes(contextType)) {
                contextAttributes.preserveDrawingBuffer = true;
            }
            return getContext.call(this, contextType, contextAttributes);
            }
        `);

        // Click "next button"
        const script = `
            const shadowHost = document.querySelector("#root > div:nth-child(1) > div.smb-onboarding-page.pre-onboarding-page.pl-20.pr-20.pb-20 > div.smb-onboarding-page__content-wrapper > div > div.smb-onboarding-page__left-side > div > section > footer > div.bpl-footer__right > div > div:nth-child(2) > apl-button");
            const shadowRoot = shadowHost.shadowRoot;
            const button = shadowRoot.querySelector("button");
            button.click();
        `;
        await driver.executeScript(script);

        await eyes.check(Target.window().fully().withName("Choose an address page"));

        await new Promise(resolve => setTimeout(resolve, 30000));  // Enter address for map

        await eyes.check(Target.window().fully().withName("Map ith pin"));

        // Verify the full login page loaded correctly.


    });
    
    afterEach(async function() {

        // Close Eyes to tell the server it should display the results.
        await eyes.closeAsync();

        // Quit the WebDriver instance.
        await driver.quit();
    
    });
    
    after(async () => {
    
        // Close the batch and report visual differences to the console.
        // Note that it forces Mocha to wait synchronously for all visual checkpoints to complete.
        const allTestResults = await runner.getAllTestResults();
        console.log(allTestResults);
    });
})
