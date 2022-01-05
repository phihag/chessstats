const assert = require('assert');
const {decodePgn} = require('../chesscom.js');

test('decodePgn', () => {
    const EXPECTED_PGN = `1. a3 h5 2. Nc3 h4 3. Na2 h3 4. Nc3 hxg2 5. Na2 gxh1=Q 6. Nc3 f5 7. Na2 f4 8. Nc3 f3 9. Na2 Nc6 10. Nb4 Nd4 11. Na2 Nf5 12. Nb4 Ne3 13. Na2 Ng4 14. Nb4 Nxf2 15. Na2 Ne4 16. Nb4 Nef6 17. Na2 Nh7 18. Nb4 Nhf6 19. d3 f2+ 20. Kd2 fxg1=R 21. Kc3 e5 22. Kb3 e4 23. Ka2 e3 24. Kb3 Ng4 25. Ka2 Ne5 26. Kb3 Nf3 27. Ka2 Nd4 28. Rb1 Nxe2 29. Ra1 Nf4 30. Rb1 e2 31. Ra1 exf1=N 32. Rb1 g5 33. Qf3 g4 34. Qxh1 g3 35. b3 g2 36. a4 gxh1=B 37. a5 Nh6 38. a6 Ng8 39. axb7 Nh6 40. bxc8=Q Ng8 41. d4 Ne6 42. d5 Qxc8 43. d6 Be7 44. dxe7 Qd8 45. Na6 Nf8 46. exf8=R+ Kxf8 47. Ka3 d5 48. Ka2 d4 49. Ka3 d3 50. Ka2 d2 51. Ka3 dxc1=N 52. Kb2 c5 53. Kxc1 c4 54. Ra1 cxb3 55. Kb2 Qe8 56. Kc3 b2 57. Kb3 bxa1=B  1/2-1/2`;
    const ccData = `iq3NbsNFsiFxisxosio}is1LsiLDisDvsi5QizQBziBLizLuziuEizEnzinCizCTziT3iz3Tltvneln]ls0KsrKCriCuirTEriEKirKvrivBabBmbamDabumbam)ab2MdvMEvhEwjrwoqyo$yG!VGOV!OX!VX}V!tBDSBJ76JR90R067zOS90]89iqZJqiJBiqBtqitliql(qjYIjcIAbaArcj78jsrjsrj@`;

    assert.equal(decodePgn({
        result: '1/2 - 1/2',
    }, ccData), EXPECTED_PGN);
});
