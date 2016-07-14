var assert = require("assert"); // node.js core module
var openinghours = require('../index.js');  // our module
var expect    = require("chai").expect; //chai expect module

describe('OpeningHours - Tests', function(){
  describe('Methods Checking', function(){
    it('should have a getBusinessOpeningHours Method', function(){
      assert.equal(typeof openinghours, 'object');
      assert.equal(typeof openinghours.getBusinessOpeningHours, 'function');
    })
  }),
  describe('Passing params', function(){
    it ('(1,1,1) should return null', function() {
        expect(openinghours.getBusinessOpeningHours(1,1,1)).to.equal(null);
    }),
     it ('("a",1,1) should return null', function() {
        expect(openinghours.getBusinessOpeningHours(10,1,1)).to.equal(null);
    }),
     it ('("a",1,"a") should return null', function() {
        expect(openinghours.getBusinessOpeningHours(10,1,1)).to.equal(null);
    })    
  }),
  describe('Handling response', function(){
    var responseObj = openinghours.getBusinessOpeningHours('Mo-Su 8:30-12:30,13:30-17:30', 10, 'it');  
    it ('(Mo-Fr 8:30-12:30,13:30-17:30,10,it) should NOT return null', function() {
        assert.equal(typeof responseObj, 'object');
    }),                      
    it ('response.is_now_open must be a boolean', function() {
        assert.equal(typeof responseObj.is_now_open, 'boolean');
    }),
    it ('response.nextChange must be a String', function() {
        assert.equal(typeof responseObj.nextChange, 'string');
    }),
    it ('response.nextChangeHours must be a String', function() {
        assert.equal(typeof responseObj.nextChangeHours, 'string');
    }),
    it ('response.today must be a Object', function() {
        assert.equal(typeof responseObj.today, 'object');
    }),
    it ('response.tomorrow must be a Object', function() {
        assert.equal(typeof responseObj.tomorrow, 'object');
    }),
    it ('response.today.intervals must not be empty', function() {
        expect(responseObj.today.intervals).not.to.be.empty;
    }),
    it ('response.tomorrow.intervals must not be empty', function() {
        expect(responseObj.tomorrow.intervals).not.to.be.empty;
    }),
    it ('response.today.intervalsString must not be empty', function() {
        expect(responseObj.today.intervalsString).not.to.be.empty;
    }),
    it ('response.tomorrow.intervalsString must not be empty', function() {
        expect(responseObj.tomorrow.intervalsString).not.to.be.empty;
    })     
  }),
  describe('Handling response internal objects', function(){
    var responseObj = openinghours.getBusinessOpeningHours('Mo-Su 8:30-12:30,13:30-17:30', 10, 'it');  
    it ('today.intervals[0].open must be String', function() {
        assert.equal(typeof responseObj.today.intervals[0].open, 'string');
    }),
    it ('today.intervals[0].close must be String', function() {
        assert.equal(typeof responseObj.today.intervals[0].close, 'string');
    }),
    it ('tomorrow.intervals[0].open must be String', function() {
        assert.equal(typeof responseObj.tomorrow.intervals[0].open, 'string');
    }),
    it ('tomorrow.intervals[0].close must be String', function() {
        assert.equal(typeof responseObj.tomorrow.intervals[0].close, 'string');
    }),
    it ('today.intervalsString[0] must be String', function() {
        assert.equal(typeof responseObj.today.intervalsString[0], 'string');
    }),
    it ('tomorrow.intervalsString[0] must be String', function() {
        assert.equal(typeof responseObj.tomorrow.intervalsString[0], 'string');
    })        
  })            
});  