let l1 = [2,4,3],l2 = [5,6,4]


var addTwoNumbers = function(l1, l2) {
   
   const res = Number(l1.reverse().join('')) + Number(l2.reverse().join(''))
    
    // return res
    return res.toString().split('')
    
};

console.log(addTwoNumbers(l1,l2));
