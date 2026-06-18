/**
 * Module de calcul du score de confiance et des pénalités de retard.
 * Conforme aux normes de facturation et aux exigences de prédiction du MVP.
 */

/**
 * Calcule le score de confiance d'un client (entre 0 et 100).
 * 100 : Fiabilité maximale, aucun retard.
 * 0 : Risque d'impayé très élevé.
 * 
 * @param {Object} client - Les données du client.
 * @param {Array} client.historique - L'historique des paiements passés.
 * @param {string} client.historique[].date_echeance - Date d'échéance de la facture.
 * @param {string} client.historique[].date_paiement_effective - Date réelle du règlement.
 * @returns {Object} Un objet contenant le score, le délai moyen de paiement et le niveau de risque.
 */
export function calculerScoreClient(client) {
  const historique = client?.historique || [];
  
  if (historique.length === 0) {
    return {
      score: 100,
      delaiMoyen: 0,
      niveauRisque: 'Faible',
      couleur: 'var(--color-success, #10b981)' // Vert par défaut
    };
  }

  let totalJoursRetard = 0;
  let nombreRetards = 0;

  // Analyse individuelle de chaque paiement historique
  const retards = historique.map(paiement => {
    const echeance = new Date(paiement.date_echeance);
    const effectif = new Date(paiement.date_paiement_effective);
    
    // Calcul de la différence en jours
    const diffTime = effectif.getTime() - echeance.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const retardJours = diffDays > 0 ? diffDays : 0;
    if (retardJours > 0) {
      nombreRetards++;
      totalJoursRetard += retardJours;
    }
    return retardJours;
  });

  const totalFactures = historique.length;
  const delaiMoyen = Number((totalJoursRetard / totalFactures).toFixed(1));
  const ratioRetard = nombreRetards / totalFactures;

  // 1. Score de base lié au délai moyen de paiement (Poids : 60%)
  let scoreHistorique = 100;
  if (delaiMoyen > 0) {
    if (delaiMoyen <= 3) {
      scoreHistorique = 90;
    } else if (delaiMoyen <= 10) {
      scoreHistorique = 70;
    } else if (delaiMoyen <= 30) {
      scoreHistorique = 40;
    } else {
      scoreHistorique = 15;
    }
  }

  // Pénalisation proportionnelle au ratio de factures payées en retard
  scoreHistorique = scoreHistorique * (1 - ratioRetard * 0.4);

  // 2. Score de tendance récente sur les 3 derniers paiements (Poids : 40%)
  const retardsRecents = retards.slice(-3);
  let scoreTendance = 100;

  if (retardsRecents.length > 0) {
    const retardMoyenRecent = retardsRecents.reduce((sum, val) => sum + val, 0) / retardsRecents.length;
    
    if (retardMoyenRecent > delaiMoyen) {
      // Dégradation de la rapidité de paiement
      const ecart = retardMoyenRecent - delaiMoyen;
      scoreTendance = Math.max(0, 100 - (ecart * 6) - 15);
    } else if (retardMoyenRecent === 0) {
      // Amélioration parfaite récente
      scoreTendance = 100;
    } else {
      // Stabilité ou amélioration progressive
      scoreTendance = Math.min(100, 100 - (retardMoyenRecent * 2));
    }
  }

  // Calcul pondéré final
  const scoreFinal = Math.round((scoreHistorique * 0.6) + (scoreTendance * 0.4));
  const scorePlafonne = Math.max(0, Math.min(100, scoreFinal));

  // Catégorisation du niveau de risque
  let niveauRisque = 'Faible';
  let couleur = '#10b981'; // Vert (Success)

  if (scorePlafonne < 40) {
    niveauRisque = 'Élevé';
    couleur = '#ef4444'; // Rouge (Danger)
  } else if (scorePlafonne < 75) {
    niveauRisque = 'Modéré';
    couleur = '#f59e0b'; // Orange (Warning)
  }

  return {
    score: scorePlafonne,
    delaiMoyen,
    niveauRisque,
    couleur
  };
}

/**
 * Calcule les pénalités de retard légales françaises.
 * Formule : Montant * (Taux Légal / 100) * (Jours de Retard / 365) + 40 € d'indemnité forfaitaire.
 * 
 * @param {number} montant - Montant principal dû.
 * @param {string} dateEcheance - Date d'échéance de la facture.
 * @param {string} [dateCalcul] - Date de calcul de la pénalité (par défaut aujourd'hui).
 * @param {number} [tauxAnnuel] - Taux d'intérêt annuel (par défaut 10%).
 * @returns {Object} Un objet contenant le montant des pénalités, l'indemnité forfaitaire et le total.
 */
export function calculerPenalitesRetard(montant, dateEcheance, dateCalcul = new Date().toISOString(), tauxAnnuel = 10.0) {
  const echeance = new Date(dateEcheance);
  const calcul = new Date(dateCalcul);
  
  const diffTime = calcul.getTime() - echeance.getTime();
  const joursRetard = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (joursRetard <= 0) {
    return {
      joursRetard: 0,
      penalitesInterets: 0,
      indemniteForfaitaire: 0,
      totalPenalites: 0
    };
  }

  // Calcul des intérêts moratoires (Taux annuel appliqué prorata temporis)
  const penalitesInterets = Number((montant * (tauxAnnuel / 100) * (joursRetard / 365)).toFixed(2));
  
  // Indemnité forfaitaire légale pour frais de recouvrement (France)
  const indemniteForfaitaire = 40.00;

  return {
    joursRetard,
    penalitesInterets,
    indemniteForfaitaire,
    totalPenalites: Number((penalitesInterets + indemniteForfaitaire).toFixed(2))
  };
}

/**
 * Génère des alertes prédictives pour les factures en cours non payées.
 * 
 * @param {Object} facture - La facture à analyser.
 * @param {Object} client - Le client associé avec son historique.
 * @returns {Object|null} L'alerte générée ou null si aucun risque majeur n'est détecté.
 */
export function genererAlertePredictive(facture, client) {
  if (facture.statut_paiement === 'Paye') return null;

  const { score, delaiMoyen } = calculerScoreClient(client);
  const dateEcheance = new Date(facture.date_echeance);
  const aujourdhui = new Date();
  
  const diffTime = dateEcheance.getTime() - aujourdhui.getTime();
  const joursAvantEcheance = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Scénario 1 : La facture est déjà en retard
  if (joursAvantEcheance < 0) {
    const joursRetard = Math.abs(joursAvantEcheance);
    return {
      type: 'danger',
      message: `Facture en retard critique de ${joursRetard} jour(s). Score client bas (${score}/100).`,
      priorite: 1
    };
  }

  // Scénario 2 : L'échéance approche à grands pas (J-3) et le client a un historique de retard supérieur à 5 jours
  if (joursAvantEcheance <= 3 && delaiMoyen > 5) {
    return {
      type: 'warning',
      message: `Échéance à J-${joursAvantEcheance}. Ce client règle ses factures avec un retard moyen de ${delaiMoyen} jours.`,
      priorite: 2
    };
  }

  // Scénario 3 : Client à risque élevé (score < 40) avec échéance à J-7
  if (joursAvantEcheance <= 7 && score < 40) {
    return {
      type: 'warning',
      message: `Attention : Facture due dans ${joursAvantEcheance} jours pour un client à haut risque de retard (Score : ${score}/100).`,
      priorite: 3
    };
  }

  return null;
}
