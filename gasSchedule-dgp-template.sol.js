pragma solidity ^0.4.11;

contract gasSchedule{

uint32[39] _gasSchedule=[

10, //0: tierStepGas0
10, //1: tierStepGas1
10, //2: tierStepGas2
10, //3: tierStepGas3
10, //4: tierStepGas4
10, //5: tierStepGas5
10, //6: tierStepGas6
10, //7: tierStepGas7
10, //8: expGas
50, //9: expByteGas
30, //10: sha3Gas
6, //11: sha3WordGas
200, //12: sloadGas
20000, //13: sstoreSetGas
5000, //14: sstoreResetGas
15000, //15: sstoreRefundGas
1, //16: jumpdestGas
375, //17: logGas
8, //18: logDataGas
375, //19: logTopicGas
32000, //20: createGas
700, //21: callGas
2300, //22: callStipend
9000, //23: callValueTransferGas
25000, //24: callNewAccountGas
24000, //25: suicideRefundGas
3, //26: memoryGas
512, //27: quadCoeffDiv
200, //28: createDataGas
21000, //29: txGas
53000, //30: txCreateGas
4, //31: txDataZeroGas
68, //32: txDataNonZeroGas
3, //33: copyGas
700, //34: extcodesizeGas
700, //35: extcodecopyGas
400, //36: balanceGas
5000, //37: suicideGas
24576 //38: maxCodeSize

];
function getSchedule() constant returns(uint32[39] _schedule){
	return _gasSchedule;
}

}

