const { poolPromise, sql } = require('../../config/db');

const createDischarge = async (internmentId, dischargeDate, dischargeTime, authorizingDoctorId) => {
 
  try {
    // Combina dischargeDate y dischargeTime para crear una fecha y hora en formato ISO 8601
    const isoDischargeTime = new Date(`${dischargeDate}T${dischargeTime}:00Z`).toISOString();
    console.log(`Fecha y hora combinadas en formato ISO 8601: ${isoDischargeTime}`);

    // Extrae solo la hora en formato HH:mm:ss
    const dischargeTimeFormatted = isoDischargeTime.split('T')[1].split('.')[0]; 
    const [hours, minutes, seconds] = dischargeTimeFormatted.split(':');
    const timeAsDate = new Date();
    timeAsDate.setUTCHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);


    const pool = await poolPromise;
   

    const result = await pool.request()
      .input('internmentId', sql.Int, internmentId)
      .input('dischargeDate', sql.Date, dischargeDate)
      .input('dischargeTime', sql.Time, timeAsDate) // Objeto Date que contiene solo la hora
      .input('authorizingDoctorId', sql.Int, authorizingDoctorId)
      .query(`
        INSERT INTO Altas (id_internamiento, fecha_alta, hora_alta, id_medico_autorizador)
        OUTPUT INSERTED.id_alta, INSERTED.id_internamiento, INSERTED.fecha_alta, INSERTED.hora_alta, INSERTED.id_medico_autorizador
        VALUES (@internmentId, @dischargeDate, @dischargeTime, @authorizingDoctorId);
      `);

    return result.recordset[0];
  } catch (error) {
    console.error('Error creando el alta: ' + error.message);
    throw new Error('Error creating discharge: ' + error.message);
  }
};




const listDischarges = async () => {

    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .query(`
          SELECT 
            a.id_alta,
            a.id_internamiento,
            a.fecha_alta,
            a.hora_alta,
            a.id_medico_autorizador,
            i.numero_habitacion,
            i.cama_asignada,
            i.fecha_ingreso,
            d.nombres AS doctor_names,
            d.apellidos AS doctor_last_names
          FROM Altas a
          JOIN Internamientos i ON a.id_internamiento = i.id_internamiento
          JOIN Medicos d ON a.id_medico_autorizador = d.id_medico
        `);
      
      // Procesar resultados para ajustar el formato de hora
      const formattedDischarges = result.recordset.map(discharge => {
        return {
          ...discharge,
          hora_alta: discharge.hora_alta.toISOString().substr(11, 8)  // Extrae solo la parte de la hora
        };
      });
      
      return formattedDischarges;
    } catch (error) {
      throw new Error('Error listing discharges: ' + error.message);
    }
  };
  

module.exports = {
  createDischarge,
  listDischarges
};
