/**
 * 
 */
this.atmosLowLevel = {
    'sanity test': function(test) {
        test.ok(true, 'nodeunit is ok');
        test.done();
    },
    
    'async test': function(test) {
    	test.expect(1);
    	
    	var callback = function() {
    		test.ok(true, 'timeout passed');
    		test.done();
    	};
    	
    	window.setTimeout(callback, 100);
    },
    
    'atmos credentials': function(test) {
    	test.ok( typeof(window.atmosConfig) !== 'undefined', 'Found atmosConfig' );
    	test.ok( typeof(window.atmosConfig.uid) !== 'undefined', 'Found atmos UID: ' + window.atmosConfig.uid );
    	test.ok( typeof(window.atmosConfig.secret) !== 'undefined', 'Found atmos shared secret' );
    	test.done();
    },
    
    /*!
     * Test the signature algorithm using the request in the programmer's guide.
     */
    'signature test': function(test) {
    	
    	var config = {
    			uid: '6039ac182f194e15b9261d73ce044939/user1',
    			secret: 'LJLuryj6zs8ste6Y3jTGQp71xq0='
    	};
    	var esu = new AtmosRest( config );
    	
    	var headers = new Object();
    	headers["X-Emc-Date"] = 'Thu, 05 Jun 2008 16:38:19 GMT';
    	headers["Date"] = 'Thu, 05 Jun 2008 16:38:19 GMT';
    	headers["X-Emc-Listable-Meta"] = 'part4/part7/part8=quick';
    	headers["X-Emc-Meta"] = 'part1=buy';
    	headers["X-Emc-Groupacl"] = 'other=NONE';
    	headers["X-Emc-Useracl"] = 'john=FULL_CONTROL,mary=WRITE';

    	var signature = esu._signRequest('POST', headers, 'application/octet-stream', '', '/rest/objects');
    	
    	test.equal( signature, 'WHJo1MFevMnK4jCthJ974L3YHoo=', 'Signature matches' );
    	test.done();
    }
};