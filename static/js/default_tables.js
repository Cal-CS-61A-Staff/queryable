export {preexisting};

let preexisting = `
    create table a as select 1 as a union 
                      select 2; 
    create table b as select 3 as a union 
                      select 2;
`;