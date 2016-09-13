/*
  Jasmine docs: 
    http://jasmine.github.io/2.0/introduction.html
  
  Basic tests:
    expect(aValue).toBe(value)
        .toMatch(regex)
        .not.toBeUndefined()
        .toBeTruthy();
        .toContain("bar");
        .toBeLessThan(pi);
    expect(aFunction).toThrow();
    expect(12).toEqual(jasmine.any(Number));  
        
  Protractor ref: 
    http://www.protractortest.org/#/api
  
  Protractor vs WebDriverJS: 
    http://www.protractortest.org/#/webdriver-vs-protractor
  webdriver.By -> by
  browser.findElement(...) -> element(...)
  browser.findElements(...) -> element.all(...)

*/
var path = require('path');

var fileToUpload = './statements.json';
var url = 'host/api/proxy/afront/';
console.log("Connecting to: ", url);

var userSufix = Date.now()+Math.floor((Math.random() * 1000) + 1);

var afront = {
    addUser: function(login, role, pass, email) {
        pass = typeof pass !== 'undefined' ? pass : login;
        email = typeof email !== 'undefined' ? email : login + '@example.com';
        switch(role) {
            case 'dev': role = '.fa-code'; break;
            case 'tea': role = '.fa-book'; break;
            case 'stu': role = '.fa-graduation'; break;
        }

        browser.get(url + 'signup');
        element(by.model('user.username')).sendKeys(login);
        element(by.model('user.password')).sendKeys(pass);
        element(by.model('user.email')).sendKeys(email);
        element(by.model('repeatedPassword')).sendKeys(pass);
        element(by.css(role)).click();
        
        element(by.css('.btn-signup')).click();
    },
    
    login: function(login, pass) {
        pass = typeof pass !== 'undefined' ? pass : login;		
        browser.get(url + 'login');
		
        element(by.model('user.username')).sendKeys(login);
        element(by.model('user.password')).sendKeys(pass);
        
        element(by.css('.btn-login')).click();
    },
    
    logout: function() {
        browser.get(url + 'home');
        element(by.id('dropdownUser')).click();
        element(by.css('.fa-sign-out')).click();
    },
    
	goHome: function(){
		element(by.cssContainingText('.btn', 'Home')).click();
	},
	
    addGame: function(title) {
        browser.get(url + 'home');
        element(by.model('game.gameTitle')).sendKeys(title);        
        element(by.css('.btn-primary')).click();
    },

    removeFirstGame: function() {
        afront.goHome();
        element(by.css('.glyphicon-remove-sign')).click();
    },
    
    gameFromDropdown: function(title) {
        browser.get(url + 'home');
        element(by.id('dropdownGames')).click();
        element(by.id('dropdownGames').by.linkText(title)).click();
    },
    
    countGamesInDropdown: function() {
        return element.all(by.id('dropdownGames')).count();
    },

    countGamesInHome: function() {
        return element.all(by.css('.glyphicon-stats')).count();
    },
    
	gotoLeftMenuItem: function(item) {
        element(by.cssContainingText('.left-menu-item', item)).click();
		browser.waitForAngular();
		//The parent is active
        expect(element(by.cssContainingText('.left-menu-item', item)).element(by.xpath("..")).getAttribute('class'))
            .toContain('active');
    },
	
	setPublicGame: function() {
		element(by.cssContainingText('.checkbox', 'Public game')).click();
		
		element(by.model('checkboxPublic')).isSelected().then(function(selected) {
			if (!selected) {
				element(by.model('checkboxPublic')).click();
			}
		});
		
		browser.waitForAngular();
		expect(element(by.model('checkboxPublic')).isSelected()).toBe(true);
	},
	
	selectVisualizationConfigTab: function(item) {
        element(by.linkText(item)).click();
		browser.waitForAngular();
		//The parent is active
        expect(element(by.linkText(item)).element(by.xpath("..")).getAttribute('class'))
            .toContain('active');
    },
	
	selectxApiStatements: function() {
		absolutePath = path.resolve(__dirname, fileToUpload);
		
		console.log('uploading statements file from: ', absolutePath, ' ...');
		$('input[file-reader="statementsFile"]').sendKeys(absolutePath);    
		element(by.buttonText('Start statements analysis')).click();
	}
    
}

describe('When creating users', function() {
   
    it('should create a dev user (dev)', function() {
        afront.addUser('dev'+userSufix, 'dev');
    });
	
    it('should create a teacher user (tea)', function() {
        afront.addUser('tea'+userSufix, 'tea');
    });
	
    it('should fail login with bad pass', function() {
        afront.login('dev'+userSufix, 'badpass');
        expect(browser.getCurrentUrl()).toContain('/login');
    });
    
    it('should login with good pass as dev', function() {
        afront.login('dev'+userSufix);
        expect(browser.getCurrentUrl()).toContain('/home');
    });
    
    it('should logout correctly', function() {
        afront.logout();
        expect(browser.getCurrentUrl()).toContain('/login');
    });    
    
    it('should login with good pass as tea', function() {
        afront.login('tea'+userSufix);
        expect(browser.getCurrentUrl()).toContain('/home');
        afront.logout();
        expect(browser.getCurrentUrl()).toContain('/login');
    });
});

describe('When logged as dev', function() {
    
    var gameUrl;
    
	//Create game
    it('should create games (testgame)', function() {
        afront.login('dev'+userSufix);
        expect(browser.getCurrentUrl()).toContain('/home');
        
        expect(afront.countGamesInDropdown()).toBe(0);
        
        afront.addGame('testgame');
        gameUrl = browser.getCurrentUrl();
        expect(gameUrl).toMatch(/.*?game=[a-z0-9]+&version=[a-z0-9]+/);
        expect(afront.countGamesInDropdown()).toBe(1);        
    });
	
	//Public Game
	it('should go to config', function() {
		afront.gotoLeftMenuItem('Old Analytics');
		afront.setPublicGame();
	});
	
	//Config visualizations - analysis
	it('should go to analytics setup', function() {
		afront.gotoLeftMenuItem('Analytics Setup');
		afront.selectVisualizationConfigTab('5.- Test Everything');
	});
	
	it('should upload statements', function() {
		afront.selectxApiStatements();
	});
    
	//Remove game
	it('should go home', function() {
		afront.goHome();
		expect(browser.getCurrentUrl()).toContain('/home');
	});
	
    it('should remove games', function() {
        expect(afront.countGamesInHome()).toBe(1);	
        afront.removeFirstGame();
        expect(afront.countGamesInHome()).toBe(0);
    });
});

        